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
import {
  completeJob,
  createJob,
  failJob,
  getJob,
  setMerchantName,
  setProgress,
} from "@/lib/ingest/jobs";
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

  const requestedName = (body.merchantName ?? "").trim();
  const transcript = (body.transcript ?? "").trim();
  const domainHint = (body.domain ?? "").trim();

  if (!transcript && !domainHint) {
    return NextResponse.json(
      { error: "Supply a transcript or a domain" },
      { status: 400 },
    );
  }
  // The name can come from the conversation instead of the caller: when the
  // shop introduces itself, that is a better name than anything the UI guessed.
  if (!requestedName && !transcript) {
    return NextResponse.json(
      { error: "merchantName is required when no transcript is supplied" },
      { status: 400 },
    );
  }

  let job;
  try {
    job = await createJob(requestedName || "Identifying…", "research");
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
      // What products get filed under. Replaced by the shop's own name once
      // the lookup finds it, so a placeholder never becomes a merchant.
      let merchantName = requestedName;

      // Identify whenever we can, even with a domain in hand: the domain tells
      // us where to read, not who they are, and skipping this left products
      // filed under whatever placeholder the caller sent.
      if (!domain || !merchantName) {
        await setProgress(job.id, "Looking up your shop online…");
        identity = await identifyMerchant(transcript || domain || "");
        domain = domain || identity.domain;
        // Prefer the name the shop is actually known by. The caller may have
        // sent a placeholder, or nothing at all.
        if (identity.name && (!merchantName || identity.confidence === "high")) {
          merchantName = identity.name;
          // Publish it now rather than at the end: the screen can name the shop
          // while the crawl it triggered is still running.
          await setMerchantName(job.id, merchantName);
        }

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

      if (!merchantName) {
        await completeJob(job.id, {
          identity,
          domain,
          published: [],
          count: 0,
          gaps: [],
          followUp: "What's your shop called? I'll file everything under that.",
        });
        return;
      }

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
        merchantName,
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
