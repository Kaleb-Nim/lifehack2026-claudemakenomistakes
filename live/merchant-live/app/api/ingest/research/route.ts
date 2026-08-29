// Turns what a merchant said during onboarding into real listings in the
// catalogue.
//
//   transcript ─► identify the shop (model + web search)
//              ─► read that shop's own product feed (no model)
//              ─► map to catalogue rows (model, verified)
//              ─► publish, and report what is still missing
//
// POST returns a job id immediately; the work continues via after(). Web
// search alone runs to tens of seconds, and paging a storefront then mapping
// it exceeds Vercel's 60s ceiling, so finishing inside the request is not an
// option. GET polls the job.

import { NextResponse, after } from "next/server";

import { findMerchantSlugByDomain, publish, type ProductInput } from "@/lib/catalog";
import { completeJob, createJob, failJob, getJob, setProgress } from "@/lib/ingest/jobs";
import { normaliseMany, publishable } from "@/lib/ingest/normaliser";
import { identifyMerchant } from "@/lib/ingest/research";
import { fetchStorefront, listingsToChunks } from "@/lib/ingest/storefront";

export const maxDuration = 60;

// Enough to prove a real catalogue without hammering a shop's servers or
// spending minutes in the mapping model on the first import.
const MAX_LISTINGS = 40;

export async function POST(request: Request) {
  let body: { merchantName?: string; transcript?: string; domain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const merchantName = (body.merchantName ?? "").trim();
  const transcript = (body.transcript ?? "").trim();
  const domainHint = (body.domain ?? "").trim();

  if (!merchantName) {
    return NextResponse.json({ error: "merchantName is required" }, { status: 400 });
  }
  if (!transcript && !domainHint) {
    return NextResponse.json(
      { error: "Supply a transcript or a domain" },
      { status: 400 },
    );
  }

  let job;
  try {
    job = await createJob(merchantName, "research");
  } catch (error) {
    console.error("Could not create job", error);
    return NextResponse.json({ error: "Could not start the import." }, { status: 502 });
  }

  // Runs after the response is sent. Everything inside must record its own
  // outcome on the job row: nothing here can reach the caller.
  after(async () => {
    try {
      let domain = domainHint || null;
      let identity = null;

      if (!domain) {
        await setProgress(job.id, "Looking up your shop online…");
        identity = await identifyMerchant(transcript);
        domain = identity.domain;

        if (!domain) {
          // Not an error: we simply could not find them, and the merchant can
          // supply the domain or upload a spreadsheet instead.
          await completeJob(job.id, {
            identity,
            published: [],
            count: 0,
            gaps: [],
            followUp:
              identity.note ??
              "I couldn't find your shop's website. What's your website address, or would you rather upload your price list?",
          });
          return;
        }
      }

      await setProgress(job.id, `Reading the catalogue on ${domain}…`);
      const storefront = await fetchStorefront(domain, MAX_LISTINGS);

      if (storefront.listings.length === 0) {
        await completeJob(job.id, {
          identity,
          domain,
          published: [],
          count: 0,
          gaps: [],
          followUp: `I found ${domain} but couldn't read a product list from it. Could you upload your price list instead?`,
          note: storefront.note,
        });
        return;
      }

      await setProgress(
        job.id,
        `Found ${storefront.listings.length} products on ${domain}. Reading them…`,
      );
      const mapped = await normaliseMany(
        listingsToChunks(storefront.listings),
        `${domain} storefront`,
        async (done, total) => {
          await setProgress(job.id, `Reading products… ${done} of ${total}`);
        },
      );
      const ready = publishable(mapped);

      let published: Awaited<ReturnType<typeof publish>> = [];
      if (ready.length > 0) {
        await setProgress(job.id, `Adding ${ready.length} products to your catalogue…`);
        // Reuse the slug this shop is already filed under, if any, so a
        // merchant who was scraped before onboarding is not listed twice.
        const existingSlug = await findMerchantSlugByDomain(domain);
        published = await publish(
          ready.map(
            (p): ProductInput => ({
              title: p.title,
              priceCents: p.priceCents as number,
              category: p.category,
              description: p.description,
              brand: p.brand,
              sku: p.sku,
              tags: p.tags,
              currency: p.currency,
              available: p.available,
              imageUrl: p.imageUrl,
              productUrl: p.productUrl,
            }),
          ),
          merchantName,
          existingSlug ?? undefined,
        );
      }

      await completeJob(job.id, {
        identity,
        domain,
        published,
        count: published.length,
        skipped: mapped.products.length - ready.length,
        gaps: mapped.gaps,
        followUp: mapped.followUp,
      });
    } catch (error) {
      console.error("Research job failed", job.id, error);
      await failJob(
        job.id,
        "Something went wrong reading your catalogue. You can try again or upload your price list.",
      ).catch(() => undefined);
    }
  });

  return NextResponse.json({ jobId: job.id, status: job.status }, { status: 202 });
}

export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }
  const job = await getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "No such job" }, { status: 404 });
  }
  return NextResponse.json(job);
}
