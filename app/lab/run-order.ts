// Person A — how the Lab's runs table orders and words its rows. Pure; the table
// (a client component) and the printable report both import it.
import type { Run } from "../../lib/schema";
import { materialLabel } from "./material-label";

export type SortKey =
  | "test" | "investigation" | "pi" | "family" | "thickness" | "o2" | "flow" | "direction" | "events" | "flags";
export type Dir = "asc" | "desc";

/** The table's order when it opens. */
export const DEFAULT_SORT: { key: SortKey; dir: Dir } = { key: "investigation", dir: "asc" };

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Saffire results (burn time, burn length, spread) live in observations, not events. */
export const hasRecordedResult = (r: Run) => !!r.observations?.some((o) => /burn|spread/i.test(o.label));

/** The outcome text the table shows: event keywords, else "see observations", else "outcome not recorded". */
export function outcomeText(r: Run): string {
  if (r.events.length) return r.events.join(", ");
  return hasRecordedResult(r) ? "see observations" : "outcome not recorded";
}

/** "5", "0–20", or null when the airflow is not numeric. */
export function flowText(r: Run): string | null {
  const { min, max } = r.flowCmS;
  if (min === null || max === null) return null;
  return min === max ? String(min) : `${min}–${max}`;
}

export function sortValue(r: Run, key: SortKey): string | number | null {
  switch (key) {
    case "test": return r.testId;
    case "investigation": return r.investigationId;
    case "pi": return r.pi;
    case "family": return materialLabel(r);
    case "thickness": return r.material.thicknessMm ?? null;
    case "o2": return r.o2InitialPct;
    case "flow": return r.flowCmS.max;
    case "direction": return r.flowDirection ?? null;
    case "events": return r.events.join(", ") || (hasRecordedResult(r) ? "see observations" : null);
    case "flags": return r.flags.length;
  }
}

export function compare(a: Run, b: Run, key: SortKey, dir: Dir): number {
  const va = sortValue(a, key);
  const vb = sortValue(b, key);
  // Missing values always sort last, whatever the direction.
  if (va === null && vb === null) return collator.compare(a.testId, b.testId);
  if (va === null) return 1;
  if (vb === null) return -1;
  const c = typeof va === "number" && typeof vb === "number"
    ? va - vb
    : collator.compare(String(va), String(vb));
  return (dir === "asc" ? c : -c) || collator.compare(a.testId, b.testId);
}

/** Runs in the table's opening order. Does not change the input. */
export const inTableOrder = (runs: Run[]): Run[] =>
  [...runs].sort((a, b) => compare(a, b, DEFAULT_SORT.key, DEFAULT_SORT.dir));
