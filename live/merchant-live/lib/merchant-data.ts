// Shared types for the onboarding screen.
//
// This file used to hold the demo's content — one shop's name, cards, log
// lines, hero product and catalogue count, plus the FRAMES table that played
// them on a timer. All of it was removed when the screen moved to live state;
// what a merchant sees now comes from their own voice session and their own
// ingested catalogue.
//
// The `Frame`, `Pill` and `Product` types below are unused by the live screen
// and kept only because nothing has replaced their shape yet.

export type Mark = "ok" | "q" | "flag" | "struck";
export interface LogLine { mark: Mark; text: string; tools?: boolean }

export interface Card {
  file: string;
  what: string;
  status: string;      // final status chip
  live?: boolean;      // accent chip (fresh / has conflicts) vs muted
  thumbs?: string[];
  summary: string;
  lines: string;
  open?: boolean;
}

export interface Pill { label: string; primary?: boolean }
export interface Product { name: string; price: string; priceNote?: string; stock: string }

export type Orb = "idle" | "speaking" | "listening";

export interface Frame {
  key: string;
  header: string;
  orb: Orb;
  orbLabel: string;
  agentLine: string;
  caption?: string;
  pills?: Pill[];
  log: LogLine[];
  cards: Card[];
  rightLabel?: string;
  listing?: boolean;
  dropText: string;
  goLive?: boolean;
  /** seconds this beat runs in ?auto=1 mode (timing sheet in the demo script) */
  seconds: number;
}

export const PRODUCT_NAME = "Cashew";
