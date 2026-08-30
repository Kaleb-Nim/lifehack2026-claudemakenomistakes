// Source -> canned extract matching for MERCH-03 (UP-04).
//
// "canned extract chosen by source kind + filename/host pattern with a generic fallback, so demo
// files can be re-shot without renaming code" — patterns are deliberately loose (substring /
// prefix, case-insensitive) so re-exporting the price list on shoot day as
// "Bizgram Pricelist Sept 1.pdf" still matches.

import {
  CANNED_FLYER,
  CANNED_PHOTOS,
  CANNED_PRICELIST,
  CANNED_WEBSITE,
  GENERIC_IMAGE_EXTRACT,
  GENERIC_PDF_EXTRACT,
  GENERIC_WEBSITE_EXTRACT,
  type CannedExtract,
} from "./canned-extracts";
import type { SourceKind } from "./uploads";

/** The minimal shape a match needs — a subset of StoredSource so callers don't need the full object. */
export interface MatchableSource {
  kind: SourceKind;
  name: string;
  host?: string;
}

const PRICELIST_PATTERN = /pricelist/i;
const ACER_FLYER_PATTERN = /acer/i;
const PHOTO_PATTERN = /^img[_-]/i;
const BIZGRAM_HOST_PATTERN = /(^|\.)bizgram\.com$/i;

/**
 * Picks the canned extract for a stored source by kind + filename/host pattern, falling back to a
 * generic-but-still-real extract per kind when nothing matches.
 */
export function matchCannedExtract(source: MatchableSource): CannedExtract {
  const name = source.name ?? "";

  switch (source.kind) {
    case "pdf": {
      if (PRICELIST_PATTERN.test(name)) return CANNED_PRICELIST;
      if (ACER_FLYER_PATTERN.test(name)) return CANNED_FLYER;
      return GENERIC_PDF_EXTRACT;
    }
    case "image": {
      if (PHOTO_PATTERN.test(name)) return CANNED_PHOTOS;
      return GENERIC_IMAGE_EXTRACT;
    }
    case "website": {
      const host = source.host ?? name;
      if (BIZGRAM_HOST_PATTERN.test(host)) return CANNED_WEBSITE;
      return GENERIC_WEBSITE_EXTRACT;
    }
    default: {
      // Exhaustiveness guard — SourceKind is a closed union, this branch is unreachable at
      // compile time but kept so a future kind fails loudly instead of returning `undefined`.
      const _exhaustive: never = source.kind;
      throw new Error(`matchCannedExtract: unknown source kind ${String(_exhaustive)}`);
    }
  }
}
