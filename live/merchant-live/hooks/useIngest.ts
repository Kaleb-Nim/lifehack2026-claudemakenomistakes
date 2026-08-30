"use client";

// Owns the three ways a catalogue actually gets in: a spreadsheet, the shop's
// own website, and what the owner said out loud.
//
// The onboarding UI previously called simulateUpload(), which only nudged the
// beat runner — nothing was read and nothing was stored. This hook does the
// real work and exposes the one thing the merchant needs to see afterwards:
// what landed, and what is still missing.
//
// Research is a job, so this polls. The endpoint returns immediately because
// web search plus a storefront crawl runs far past a request's lifetime.

import { useCallback, useEffect, useRef, useState } from "react";

export interface PublishedProduct {
  productRef: string;
  title: string;
  priceDisplay: string;
}

export interface Gap {
  title: string;
  missing: string[];
  consequence: string;
  question: string;
}

export interface IngestState {
  status: "idle" | "working" | "done" | "error";
  /** What is happening now, in the merchant's words. */
  progress: string;
  published: PublishedProduct[];
  gaps: Gap[];
  /** What to ask the merchant next. Rendered as the agent's own line. */
  followUp: string | null;
  /** Products understood but not published, e.g. no price. */
  skipped: number;
  /** What was read — a filename or a domain — so the UI can name the source. */
  lastSource: string;
  /**
   * The shop's own name, once the lookup has worked it out.
   *
   * Not the same as the name the caller passed in: that may be a placeholder,
   * and the point of identification is to replace it with what the shop is
   * actually called.
   */
  identifiedName: string | null;
  error: string | null;
}

const IDLE: IngestState = {
  status: "idle",
  progress: "",
  published: [],
  gaps: [],
  followUp: null,
  skipped: 0,
  lastSource: "",
  identifiedName: null,
  error: null,
};

// Slow enough not to hammer the endpoint, fast enough that progress feels live.
// Matches the placeholder the research route files a job under before it
// knows who the shop is.
const IDENTIFYING_PLACEHOLDER = "Identifying…";

const POLL_MS = 2500;
// A crawl that has not finished in five minutes is not going to; say so rather
// than polling forever behind a spinner.
const POLL_TIMEOUT_MS = 5 * 60_000;

export function useIngest(merchantName: string) {
  const [state, setState] = useState<IngestState>(IDLE);
  // Survives unmount so a late poll cannot setState on a dead component.
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const set = useCallback((patch: Partial<IngestState>) => {
    if (alive.current) setState((s) => ({ ...s, ...patch }));
  }, []);

  const reset = useCallback(() => setState(IDLE), []);

  /** Read a spreadsheet and publish what has a price. */
  const uploadSpreadsheet = useCallback(
    async (file: File) => {
      if (!merchantName.trim()) {
        set({ status: "error", error: "Tell me your shop's name first." });
        return;
      }
      set({ ...IDLE, status: "working", lastSource: file.name, progress: `Reading ${file.name}…` });

      try {
        const form = new FormData();
        form.set("file", file);
        form.set("merchantName", merchantName);
        const response = await fetch("/api/ingest/csv", { method: "POST", body: form });
        const data = await response.json();

        if (!response.ok) {
          set({ status: "error", error: data.error ?? "That file could not be read." });
          return;
        }
        set({
          status: "done",
          progress: "",
          published: data.published ?? [],
          gaps: data.gaps ?? [],
          followUp: data.followUp ?? null,
          skipped: data.skipped ?? 0,
        });
      } catch {
        set({ status: "error", error: "Could not reach the server." });
      }
    },
    [merchantName, set],
  );

  /**
   * Find the shop online and read its catalogue.
   *
   * Give a domain when the merchant supplies one; otherwise the transcript is
   * used to work out which shop they are.
   */
  const research = useCallback(
    async ({ domain, transcript }: { domain?: string; transcript?: string }) => {
      if (!merchantName.trim()) {
        set({ status: "error", error: "Tell me your shop's name first." });
        return;
      }
      set({
        ...IDLE,
        status: "working",
        lastSource: domain || "Your shop online",
        progress: domain ? `Reading ${domain}…` : "Looking up your shop online…",
      });

      let jobId: string;
      try {
        const response = await fetch("/api/ingest/research", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ merchantName, domain, transcript }),
        });
        const data = await response.json();
        if (!response.ok) {
          set({ status: "error", error: data.error ?? "Could not start that." });
          return;
        }
        jobId = data.jobId;
      } catch {
        set({ status: "error", error: "Could not reach the server." });
        return;
      }

      const startedAt = Date.now();
      while (alive.current) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (!alive.current) return;

        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          set({
            status: "error",
            error: "That is taking longer than expected. Try uploading your price list instead.",
          });
          return;
        }

        let job;
        try {
          const response = await fetch(`/api/ingest/research?jobId=${jobId}`);
          if (!response.ok) continue; // a blip mid-poll is not a failed import
          job = await response.json();
        } catch {
          continue;
        }

        if (job.status === "running" || job.status === "queued") {
          // The name resolves seconds in, long before the crawl it kicked off
          // finishes. Show it as soon as it is known rather than holding it
          // back until the whole job completes.
          const named =
            job.merchantName && job.merchantName !== IDENTIFYING_PLACEHOLDER
              ? job.merchantName
              : null;
          set({ progress: job.progress, ...(named ? { identifiedName: named } : {}) });
          continue;
        }
        if (job.status === "failed") {
          set({ status: "error", error: job.error ?? "That import stopped." });
          return;
        }

        const result = job.result ?? {};
        set({
          status: "done",
          progress: "",
          identifiedName: result.identity?.name ?? result.merchantName ?? null,
          published: result.published ?? [],
          gaps: result.gaps ?? [],
          followUp: result.followUp ?? null,
          skipped: result.skipped ?? 0,
        });
        return;
      }
    },
    [merchantName, set],
  );

  return { ...state, uploadSpreadsheet, research, reset };
}
