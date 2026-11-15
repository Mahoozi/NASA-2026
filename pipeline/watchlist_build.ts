// Person A — builds data/hardware_watchlist.json from the NESC report NTRS 20260003925
// (Abney et al. 2026) as it is stored in data/corpus.json.
//
//   npm run build:watchlist
//
// The choices below (which hardware items, which sentences, the materialKey) are ours;
// every word of every quote, hardware name and group label is checked against the corpus
// text, and each page number is read from the page's own "Page #: N of M" line. The build
// fails instead of writing anything it could not verify. Nothing is paraphrased.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { quoteIsVerbatim } from "../app/lab/findings";
import type { ContextEntry, HardwareEntry, MaterialKey, WatchlistEntry } from "../app/watchlist/types";
import type { CorpusDoc } from "../lib/schema";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const WATCHLIST_PATH = join(ROOT, "data", "hardware_watchlist.json");
export const REPORT_DOC_PREFIX = "ntrs-20260003925-p";
/** The page holding Table 2, "List of Assessed Hardware": hardware names and their group labels. */
export const HARDWARE_TABLE_DOC = `${REPORT_DOC_PREFIX}19`;

type HardwareInput = Omit<HardwareEntry, "kind" | "page">;
type ContextInput = Omit<ContextEntry, "kind" | "page">;

/** Hardware names are Table 2's own; subsystem is Table 2's "Crew System" group. */
export const HARDWARE_INPUT: HardwareInput[] = [
  {
    id: "minion-pmma-case",
    hardware: "MinION DNA sequencer",
    subsystem: "CHeCS",
    materialAsWritten: "clear PMMA (i.e., acrylic) case",
    materialKey: "pmma",
    quote: "The MinION has a clear PMMA (i.e., acrylic) case, which will not be acceptable for Exploration environments due to flammability concerns.",
    sourceDocId: `${REPORT_DOC_PREFIX}70`,
  },
  {
    id: "ccaa-silicone-foam",
    hardware: "Common Cabin Air Assembly (CCAA)",
    subsystem: "Life Support",
    materialAsWritten: "foam insulation is a silicone",
    materialKey: "silicone",
    quote: "The foam insulation is a silicone, but the specific foam is not identified. The exposed foam has a fire-retardant coating for ISS 24.1% O2, suggesting that it will be flammable in all Exploration atmospheres.",
    sourceDocId: `${REPORT_DOC_PREFIX}39`,
  },
  {
    id: "cdra-armaflex",
    hardware: "Carbon Dioxide Removal Assembly (CDRA)",
    subsystem: "Life Support",
    materialAsWritten: "Armaflex AP",
    materialKey: "other",
    quote: "Armaflex AP is used as pipe insulation on CDRA and passes flammability in 30% O2. However, when covered by the black KB 10 tape, the configuration is flammable (F-12d) [ref. 92].",
    sourceDocId: `${REPORT_DOC_PREFIX}41`,
  },
  {
    id: "cra-silicone-duct",
    hardware: "Carbon Dioxide Reduction Assembly (CRA)",
    subsystem: "Life Support",
    materialAsWritten: "a silicone duct",
    materialKey: "silicone",
    quote: "Exposed materials appear to be metallic with the exception of Teflon-insulated electrical wiring, the Dapco 2030-coated compressor fiberglass-epoxy composite acoustic cover, and a silicone duct. The acoustic cover and duct are nonflammable in 30% O2, 10.2 psia, but likely to be flammable in 34-40% O2 at 8.2 psia.",
    sourceDocId: `${REPORT_DOC_PREFIX}42`,
  },
  {
    id: "emergency-mask-nomex-bags",
    hardware: "Emergency Mask, Fire, and Ammonia Cartridges",
    subsystem: "Life Support",
    materialAsWritten: "Orange Nomex bags",
    materialKey: "nomex",
    quote: "Orange Nomex bags are used to store the emergency masks, ammonia cartridges, and fire cartridges. This material is nonflammable for up to 30% O2 10.2 psia, but would have to be modified for 34-40% O2 at 8.2 psia (e.g., fire retardant treatment) (F-12f).",
    sourceDocId: `${REPORT_DOC_PREFIX}45`,
  },
  {
    id: "upa-silicones",
    hardware: "Urine Processor Assembly (UPA)",
    subsystem: "Life Support",
    materialAsWritten: "Silicones",
    materialKey: "silicone",
    quote: "Silicones are usually flammable in 30% O2, 10.2 psia, but Bisco HT-200A is nonflammable to at least 34% O2.",
    sourceDocId: `${REPORT_DOC_PREFIX}52`,
  },
  {
    id: "uwms-velcro",
    hardware: "Universal Waste Management System (UWMS)",
    subsystem: "Life Support",
    materialAsWritten: "Velcro strips",
    materialKey: "velcro",
    quote: "The Velcro strips inside the fecal canister are longer than allowed by the standard Velcro rules [ref. 21], but are internal to the canister and not considered a concern.",
    sourceDocId: `${REPORT_DOC_PREFIX}55`,
  },
  {
    id: "wpa-teflon-cables",
    hardware: "Water Processor Assembly (WPA)",
    subsystem: "Life Support",
    materialAsWritten: "Teflon-insulated",
    materialKey: "teflon",
    quote: "Electrical cables are Teflon-insulated and nonflammable beyond 40% O2.",
    sourceDocId: `${REPORT_DOC_PREFIX}56`,
  },
  {
    id: "aqm-polycarbonate-window",
    hardware: "Air Quality Monitor (AQM)",
    subsystem: "CHeCS",
    materialAsWritten: "polycarbonate display window",
    materialKey: "polycarbonate",
    quote: "The polycarbonate display window will be acceptable for flammability in Exploration atmospheres to 30% O2 at 10.2 psia, but will be flammable at higher O2 concentrations.",
    sourceDocId: `${REPORT_DOC_PREFIX}63`,
  },
  {
    id: "cad-ultem",
    hardware: "Crew Active Dosimeter (CAD)",
    subsystem: "CHeCS",
    materialAsWritten: "Ultem 1000",
    materialKey: "other",
    quote: "The CAD body is made of Ultem 1000, which is not flammable in 30% O2 at 10.2 psia, but flammable in 34-40% O2 at 8.2 psia.",
    sourceDocId: `${REPORT_DOC_PREFIX}64`,
  },
  {
    id: "cwqmk-durette-fabric",
    hardware: "Colorimetric Water Quality Monitoring Kit (CWQMK)",
    subsystem: "CHeCS",
    materialAsWritten: "Durette fabric",
    materialKey: "fabric",
    quote: "The CWQMK is contained in a pouch, the outer surface of which is Durette fabric, acceptable for flammability at O2 concentrations up to 30% at 10.2 psia, but not for higher concentrations.",
    sourceDocId: `${REPORT_DOC_PREFIX}66`,
  },
  {
    id: "flywheel-nylon-strap",
    hardware: "Flywheel Exercise Device",
    subsystem: "CHeCS",
    materialAsWritten: "nylon",
    materialKey: "other",
    quote: "The device strap used by the crew is nylon, which is flammable, but acceptable for MPCV 30% O2 at 10.2 psia because it is crew-tended when in use and, when not in use, contained in the flywheel housing and exposed to the environment for only about 2 in. at the handle connection point.",
    sourceDocId: `${REPORT_DOC_PREFIX}67`,
  },
  {
    id: "crew-quarters-nomex-honeycomb",
    hardware: "Crew Quarters",
    subsystem: "Crew Systems",
    materialAsWritten: "Nomex honeycomb core",
    materialKey: "nomex",
    quote: "The CQ side walls and kick panels are constructed of 1-in.-thick sandwich composite panels with a Nomex honeycomb core. This design is acceptable for flammability in 30% O2, 10.2 psia [ref. 103].",
    sourceDocId: `${REPORT_DOC_PREFIX}75`,
  },
  {
    id: "galley-rack-kapton-heaters",
    hardware: "Galley Rack",
    subsystem: "Crew Systems",
    materialAsWritten: "Kapton heaters",
    materialKey: "kapton",
    quote: "The internal heater assembly contains Kapton heaters, an Aerogel blanket, and melamine foam insulation, but would be acceptable for flammability in Exploration atmospheres because the flammable materials are enclosed by nonflammable Aerogel blanket and anodized aluminum housing.",
    sourceDocId: `${REPORT_DOC_PREFIX}77`,
  },
  {
    id: "iss-food-warmer-melamine-foam",
    hardware: "ISS Food Warmer",
    subsystem: "Crew Systems",
    materialAsWritten: "melamine foam",
    materialKey: "foam",
    quote: "Inside the suitcase, the Mosites 10298-coated melamine foam is a concern for flammability in 34-40% O2, 8.2 psia, but not in 30% O2, 10.2 psia.",
    sourceDocId: `${REPORT_DOC_PREFIX}79`,
  },
];

export const CONTEXT_INPUT: ContextInput[] = [
  {
    id: "context-limited-flammability-data",
    quote: "NASA has limited material flammability data at O2 concentration higher than 30% (F-12a).",
    sourceDocId: `${REPORT_DOC_PREFIX}33`,
  },
  {
    id: "context-33-subsystems",
    quote: "A total of 33 subsystems and/or components within the ECLSS, including emergency systems, Crew Health Care Systems (CHeCS), and Crew Habitation Systems, were evaluated using available design data and historical literature.",
    sourceDocId: `${REPORT_DOC_PREFIX}13`,
  },
];

/** The report's page number: the N of the "Page #: N of M" line that opens the corpus page. */
export function reportPage(doc: CorpusDoc): number {
  const m = /Page #: (\d+) of \d+/.exec(doc.text);
  if (!m) throw new Error(`${doc.id}: no "Page #: N of M" line`);
  return Number(m[1]);
}

/** Verifies every input against the corpus and returns the entries; throws on the first failure. */
export function buildWatchlist(corpus: CorpusDoc[]): WatchlistEntry[] {
  const doc = (id: string) => {
    const d = corpus.find((x) => x.id === id);
    if (!d) throw new Error(`corpus has no doc ${id}`);
    return d;
  };
  const table = doc(HARDWARE_TABLE_DOC).text;
  const seen = new Set<string>();
  const entries: WatchlistEntry[] = [];

  for (const h of HARDWARE_INPUT) {
    if (seen.has(h.id)) throw new Error(`duplicate id ${h.id}`);
    seen.add(h.id);
    if (!quoteIsVerbatim(h.quote, h.sourceDocId, corpus)) throw new Error(`${h.id}: quote is not verbatim in ${h.sourceDocId}`);
    if (!h.quote.includes(h.materialAsWritten)) throw new Error(`${h.id}: materialAsWritten is not in the quote`);
    if (!table.includes(h.hardware)) throw new Error(`${h.id}: hardware name "${h.hardware}" is not in Table 2`);
    if (h.subsystem && !table.includes(h.subsystem)) throw new Error(`${h.id}: group "${h.subsystem}" is not in Table 2`);
    entries.push({ kind: "hardware", ...h, materialKey: h.materialKey as MaterialKey, page: reportPage(doc(h.sourceDocId)) });
  }
  for (const c of CONTEXT_INPUT) {
    if (seen.has(c.id)) throw new Error(`duplicate id ${c.id}`);
    seen.add(c.id);
    if (!quoteIsVerbatim(c.quote, c.sourceDocId, corpus)) throw new Error(`${c.id}: quote is not verbatim in ${c.sourceDocId}`);
    entries.push({ kind: "context", ...c, page: reportPage(doc(c.sourceDocId)) });
  }
  return entries;
}

function main() {
  const corpus = JSON.parse(readFileSync(join(ROOT, "data", "corpus.json"), "utf8")) as CorpusDoc[];
  const entries = buildWatchlist(corpus);
  writeFileSync(WATCHLIST_PATH, JSON.stringify(entries, null, 2) + "\n");
  const hardware = entries.filter((e) => e.kind === "hardware").length;
  console.log(`✓ ${hardware} hardware entries + ${entries.length - hardware} context → ${WATCHLIST_PATH}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
