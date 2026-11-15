// Person A — types for data/hardware_watchlist.json. Local on purpose: lib/schema.ts is frozen.
// Every quote is copied from data/corpus.json (NESC report, NTRS 20260003925); nothing here is
// ours except the ids, the materialKey grouping and the choice of which items to include.

export const MATERIAL_KEYS = [
  "pmma", "silicone", "nomex", "teflon", "kapton", "polycarbonate", "foam", "velcro", "fabric", "ultem", "other",
] as const;
export type MaterialKey = (typeof MATERIAL_KEYS)[number];

/** One hardware item whose "Qualitative M&P Evaluation" names a specific material. */
export type HardwareEntry = {
  kind: "hardware";
  id: string;
  /** Name as written in the report's Table 2 (List of Assessed Hardware). */
  hardware: string;
  /** The "Crew System" group of Table 2 that lists the hardware ("Life Support", "CHeCS", "Crew Systems"), or "". */
  subsystem: string;
  /** The material's own words, an exact substring of `quote`. */
  materialAsWritten: string;
  /** Our grouping, for matching against flight runs. "other" means the material is none of the others. */
  materialKey: MaterialKey;
  /** Verbatim from the corpus page `sourceDocId`; one or two sentences, keeping the quote's own scope. */
  quote: string;
  sourceDocId: string;
  /** The report's own page number, from the "Page #: N of M" line that opens the page. */
  page: number;
};

/** A sentence that frames the whole assessment rather than one hardware item. */
export type ContextEntry = {
  kind: "context";
  id: string;
  quote: string;
  sourceDocId: string;
  page: number;
};

export type WatchlistEntry = HardwareEntry | ContextEntry;
