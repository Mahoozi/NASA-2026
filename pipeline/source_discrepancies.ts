// Person A — places where a PSI table disagrees with NASA's own published papers.
// One list drives both the importer flags (psi_import_saffire.ts) and the audit
// report (pipeline/source_discrepancies.md), so the two cannot drift. Source
// values are never changed or filled in; each entry only adds a flag.
//
//   npx tsx pipeline/source_discrepancies.ts   (also run by npm run import:psi)
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Run } from "../lib/schema";

export type SourceDiscrepancy = {
  psiId: string;
  /** Sample numbers as written in the PSI table; "all" for every row. */
  samples: string[] | "all";
  field: string;
  tableValue: string;
  publishedValue: string;
  source: { id: string; url: string; where: string };
  /** The flag added to each affected run. */
  flag: string;
};

const NTRS_2017 = {
  id: "NTRS 20170008805",
  url: "https://ntrs.nasa.gov/citations/20170008805",
};
const NTRS_2018 = {
  id: "NTRS 20180005168",
  url: "https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf",
};

/**
 * Every published value is quoted from text fetched on 2026-11-14:
 * - NTRS 20170008805 abstract: "flame spread over a 94 x 40.6 cm thin charring solid".
 * - NTRS 20180005168 p. 16: "Saffire-III (25 cm/s)Saffire-I (20 cm/s)".
 * - NTRS 20180005168 p. 30, Table 1: "I-1 Cotton-Fiberglass 40.6 cm 0.37 mm 94 cm 20 cm/s
 *   Concurrent 21.7 to 21.5 · I-2 … 0.37 mm … · II-6 Cotton-Fiberglass 5 cm 0.37 mm 29 cm
 *   25 cm/s Concurrent ~ 22.1 · III-1 Cotton-Fiberglass 40.6 cm 0.37 mm 94 cm 25 cm/s
 *   Concurrent 21.2 to 21.0 · III-2 … 0.37 mm ~ 10 cm 25 cm/s Opposed 21.2 to 21.0".
 */
export const SOURCE_DISCREPANCIES: SourceDiscrepancy[] = [
  {
    psiId: "PSI-98",
    samples: "all",
    field: "sample length × width",
    tableValue: "length 40.6 cm, width 94 cm",
    publishedValue: "94 x 40.6 cm (Saffire-III's PSI table: length 94 cm, width 40.6 cm)",
    source: { ...NTRS_2017, where: "abstract" },
    flag: "length and width may be swapped in this table: Saffire-III's table and NTRS 20170008805 give 94 cm long × 40.6 cm wide",
  },
  {
    psiId: "PSI-98",
    samples: "all",
    field: "thickness",
    tableValue: "0.37 cm",
    publishedValue: "0.37 mm (I-1, I-2)",
    source: { ...NTRS_2018, where: "p. 30, Table 1" },
    flag: "thickness 0.37 cm in this table; NTRS 20180005168 lists 0.37 mm",
  },
  {
    psiId: "PSI-99",
    samples: ["2-6"],
    field: "airflow",
    tableValue: "20 cm/s",
    publishedValue: "25 cm/s (II-6)",
    source: { ...NTRS_2018, where: "p. 30, Table 1" },
    flag: "airflow 20 cm/s in this table; NTRS 20180005168 lists II-6 at 25 cm/s",
  },
  {
    psiId: "PSI-100",
    samples: "all",
    field: "airflow",
    tableValue: "30 cm/s",
    publishedValue: "25 cm/s (III-1, III-2)",
    source: { ...NTRS_2018, where: "p. 16; p. 30, Table 1" },
    flag: "airflow 30 cm/s in this table; NTRS 20180005168 labels Saffire-III at 25 cm/s",
  },
  {
    psiId: "PSI-100",
    samples: "all",
    field: "thickness",
    tableValue: ".33 cm",
    publishedValue: "0.37 mm (III-1, III-2)",
    source: { ...NTRS_2018, where: "p. 30, Table 1" },
    flag: "thickness .33 cm in this table; NTRS 20180005168 lists 0.37 mm",
  },
  {
    psiId: "PSI-100",
    samples: "all",
    field: "starting oxygen",
    tableValue: "not recorded (no oxygen column)",
    publishedValue: "21.2 to 21.0% (III-1, III-2)",
    source: { ...NTRS_2018, where: "p. 30, Table 1" },
    flag: "oxygen not recorded in this table; NTRS 20180005168 reports 21.2 to 21.0%",
  },
];

/** Flags this list adds to one row of a PSI table. */
export function discrepancyFlags(psiId: string, sample: string): string[] {
  return SOURCE_DISCREPANCIES.filter(
    (d) => d.psiId === psiId && (d.samples === "all" || d.samples.includes(sample)),
  ).map((d) => d.flag);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DISCREPANCY_REPORT = join(ROOT, "pipeline", "source_discrepancies.md");

/** Runs that carry each discrepancy's flag in data/runs.json. */
function flaggedRuns(runs: Run[], d: SourceDiscrepancy) {
  return runs.filter((r) => r.investigationId === d.psiId && r.flags.includes(d.flag));
}

/** Checks every entry is on a run, then writes the report. Returns the failures. */
export function writeDiscrepancyReport(runs: Run[]): string[] {
  const missing = SOURCE_DISCREPANCIES.filter((d) => !flaggedRuns(runs, d).length).map(
    (d) => `no run carries: ${d.flag}`,
  );
  if (!missing.length) writeFileSync(DISCREPANCY_REPORT, buildDiscrepancyReport(runs));
  return missing;
}

export function buildDiscrepancyReport(runs: Run[]): string {
  const cell = (s: string) => s.replace(/\|/g, "\\|");
  const rows = SOURCE_DISCREPANCIES.map((d) => {
    const ids = flaggedRuns(runs, d).map((r) => r.testId).join(", ") || "none";
    return `| ${d.psiId} | ${ids} | ${d.field} | ${cell(d.tableValue)} | ${cell(d.publishedValue)} | [${d.source.id}](${d.source.url}), ${d.source.where} |`;
  });
  return `# Source discrepancies

Where a PSI table disagrees with NASA's own published papers, Firebreak keeps the PSI value and
flags the difference. Nothing here changes or fills a value in \`data/runs.json\`; each row adds
one flag to the listed runs, and the flag shows in the Lab's runs table, the what-varied panel and
the CSV \`flags\` column.

Generated from \`SOURCE_DISCREPANCIES\` in \`pipeline/source_discrepancies.ts\` (the same list the
importer applies) and the flags in \`data/runs.json\`. ${SOURCE_DISCREPANCIES.length} discrepancies.

| Investigation | Run(s) | Field | PSI table value | Published value | Source |
|---|---|---|---|---|---|
${rows.join("\n")}

<!-- count: ${SOURCE_DISCREPANCIES.length} -->
`;
}

function main() {
  const runs = JSON.parse(readFileSync(join(ROOT, "data", "runs.json"), "utf8")) as Run[];
  const missing = writeDiscrepancyReport(runs);
  if (missing.length) {
    console.error(`✗ ${missing.join(" | ")}. Run npm run import:psi.`);
    process.exit(1);
  }
  console.log(`✓ ${SOURCE_DISCREPANCIES.length} discrepancies → ${DISCREPANCY_REPORT}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
