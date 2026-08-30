import { describe, expect, test } from "bun:test";
import { matchCannedExtract } from "./source-matcher";
import {
  CANNED_FLYER,
  CANNED_PHOTOS,
  CANNED_PRICELIST,
  CANNED_WEBSITE,
  GENERIC_IMAGE_EXTRACT,
  GENERIC_PDF_EXTRACT,
  GENERIC_WEBSITE_EXTRACT,
} from "./canned-extracts";

describe("matchCannedExtract — pdf", () => {
  test("matches a price list by filename", () => {
    expect(
      matchCannedExtract({ kind: "pdf", name: "001 Bizgram Asia Pricelist August 29, 2026.pdf" })
    ).toBe(CANNED_PRICELIST);
  });

  test("matches case-insensitively", () => {
    expect(matchCannedExtract({ kind: "pdf", name: "PRICELIST-sept.PDF" })).toBe(CANNED_PRICELIST);
    expect(matchCannedExtract({ kind: "pdf", name: "pricelist.pdf" })).toBe(CANNED_PRICELIST);
  });

  test("matches the Acer flyer by filename, case-insensitively", () => {
    expect(matchCannedExtract({ kind: "pdf", name: "ACER-LAPTOP-OFFER-PROMO-SINGAPORE.pdf" })).toBe(
      CANNED_FLYER
    );
    expect(matchCannedExtract({ kind: "pdf", name: "acer-flyer-2026.pdf" })).toBe(CANNED_FLYER);
  });

  test("falls back to the generic pdf extract when nothing matches", () => {
    expect(matchCannedExtract({ kind: "pdf", name: "warranty-terms.pdf" })).toBe(GENERIC_PDF_EXTRACT);
  });

  test("re-shot files still match without renaming code (UP-04)", () => {
    // A re-exported price list with a different date/suffix should still hit the same pattern.
    expect(matchCannedExtract({ kind: "pdf", name: "Bizgram Pricelist Sept 1 2026.pdf" })).toBe(
      CANNED_PRICELIST
    );
  });
});

describe("matchCannedExtract — image", () => {
  test("matches IMG_ prefixed photos, case-insensitively", () => {
    expect(matchCannedExtract({ kind: "image", name: "IMG_2201.jpg" })).toBe(CANNED_PHOTOS);
    expect(matchCannedExtract({ kind: "image", name: "img_9001.heic" })).toBe(CANNED_PHOTOS);
  });

  test("also matches an IMG- (hyphen) variant", () => {
    expect(matchCannedExtract({ kind: "image", name: "IMG-2201.jpg" })).toBe(CANNED_PHOTOS);
  });

  test("falls back to the generic image extract when nothing matches", () => {
    expect(matchCannedExtract({ kind: "image", name: "shelf-photo.jpg" })).toBe(GENERIC_IMAGE_EXTRACT);
  });
});

describe("matchCannedExtract — website", () => {
  test("matches the bizgram.com host, case-insensitively", () => {
    expect(matchCannedExtract({ kind: "website", name: "bizgram.com", host: "bizgram.com" })).toBe(
      CANNED_WEBSITE
    );
    expect(matchCannedExtract({ kind: "website", name: "WWW.BIZGRAM.COM", host: "WWW.BIZGRAM.COM" })).toBe(
      CANNED_WEBSITE
    );
  });

  test("falls back to the generic website extract for an unrelated host", () => {
    expect(
      matchCannedExtract({ kind: "website", name: "example.com", host: "example.com" })
    ).toBe(GENERIC_WEBSITE_EXTRACT);
  });

  test("falls back to name when host is missing", () => {
    expect(matchCannedExtract({ kind: "website", name: "bizgram.com" })).toBe(CANNED_WEBSITE);
  });
});
