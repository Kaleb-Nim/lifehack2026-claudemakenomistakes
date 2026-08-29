"use client";

// What the merchant sees after their catalogue is read.
//
// Three states worth distinguishing, because they are the three things a
// merchant actually wants to know: it is working and here is how far,
// something went wrong, or here is what landed and here is what I still need
// from you.
//
// The gaps are the point. Anyone can list what succeeded; the reason a
// merchant trusts this is that it tells them what is missing and what that
// costs them, in their own commercial terms.

import type { Gap, PublishedProduct } from "../hooks/useIngest";

interface Props {
  status: "idle" | "working" | "done" | "error";
  progress: string;
  published: PublishedProduct[];
  gaps: Gap[];
  followUp: string | null;
  skipped: number;
  error: string | null;
  onDismiss: () => void;
}

export default function IngestPanel({
  status,
  progress,
  published,
  gaps,
  followUp,
  skipped,
  error,
  onDismiss,
}: Props) {
  if (status === "idle") return null;

  return (
    <div className="ingest" role="status" aria-live="polite">
      {status === "working" && (
        <div className="ingest-row">
          <span className="ingest-spinner" aria-hidden="true" />
          <span className="ingest-progress">{progress || "Working…"}</span>
        </div>
      )}

      {status === "error" && (
        <div className="ingest-row">
          <span className="ingest-error">{error}</span>
          <button className="ingest-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      )}

      {status === "done" && (
        <>
          <div className="ingest-row">
            <strong className="ingest-count">
              {published.length === 0
                ? "Nothing new to add"
                : `${published.length} product${published.length === 1 ? "" : "s"} added`}
            </strong>
            {skipped > 0 && (
              <span className="ingest-skipped">
                {skipped} waiting on a price
              </span>
            )}
            <button className="ingest-dismiss" onClick={onDismiss}>
              Close
            </button>
          </div>

          {published.length > 0 && (
            <ul className="ingest-list">
              {/* Enough to show it is real without turning into a catalogue. */}
              {published.slice(0, 6).map((p) => (
                <li key={p.productRef}>
                  <span className="ingest-title">{p.title}</span>
                  <span className="ingest-price">{p.priceDisplay}</span>
                </li>
              ))}
              {published.length > 6 && (
                <li className="ingest-more">
                  and {published.length - 6} more
                </li>
              )}
            </ul>
          )}

          {gaps.length > 0 && (
            <ul className="ingest-gaps">
              {gaps.slice(0, 4).map((g, i) => (
                <li key={`${g.title}-${i}`}>
                  <span className="ingest-gap-title">{g.title}</span>
                  <span className="ingest-gap-why">{g.consequence}</span>
                </li>
              ))}
            </ul>
          )}

          {/* The agent's own question — the "anything else?" beat. */}
          {followUp && <p className="ingest-followup">{followUp}</p>}
        </>
      )}
    </div>
  );
}
