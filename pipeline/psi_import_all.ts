/**
 * Import every PSI run table and write the combined data/runs.json.
 *
 *   npm run import:psi
 *
 * Runs the BASS-II (PSI-25), BASS (PSI-26) and Saffire (PSI-98, PSI-99,
 * PSI-100) importers, each with its own acceptance checks, then the combined
 * checks below. Nothing is written unless every check passes.
 * Writes data/runs.json and pipeline/psi_import_report.md.
 */
import { writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Run } from "../lib/schema";
import { bassAcceptance, BASS_ID, importBass } from "./psi_import_bass";
import { acceptanceFailures, findCsv, importRuns, loadRawRows } from "./psi_import_bass2";
import { importSaffire, SAFFIRE_FILES, saffireAcceptance } from "./psi_import_saffire";
import { buildCombinedReport, type ReportGroup } from "./psi_report";
import { checker, findRawCsv, psiUrl, ROOT } from "./psi_shared";

export function combinedAcceptance(runs: Run[]) {
  const c = checker("Combined runs.json");
  const withO2 = runs.filter((r) => r.o2InitialPct !== null).map((r) => r.o2InitialPct!);
  c.check(runs.length === 263, `expected 263 runs, got ${runs.length}`);
  c.check(new Set(runs.map((r) => r.id)).size === runs.length, "run ids are not unique across tables");
  c.check(withO2.length === 140, `expected 140 runs with a recorded starting oxygen, got ${withO2.length}`);
  c.check(Math.max(...withO2) === 22.2, `expected the highest starting oxygen to be 22.2, got ${Math.max(...withO2)}`);
  c.check(withO2.every((v) => v < 23), "a run has starting oxygen of 23 or more");
  c.done();
}

export function importAll() {
  const bass2Csv = findCsv();
  const bass2 = importRuns(loadRawRows(bass2Csv));
  const fails = acceptanceFailures(bass2);
  if (fails.length) throw new Error(`PSI-25 (BASS-II): ${fails.length} acceptance check(s) failed:\n  - ${fails.join("\n  - ")}`);

  const bass = importBass();
  bassAcceptance(bass.runs, bass.skipped);

  const saffire = importSaffire();
  saffireAcceptance(saffire.runs);

  const runs = [...bass2, ...bass.runs, ...saffire.runs];
  combinedAcceptance(runs);

  const groups: ReportGroup[] = [
    { psiId: "PSI-25", name: "BASS-II", file: basename(bass2Csv), url: psiUrl("PSI-25"), runs: bass2, skipped: [] },
    { psiId: BASS_ID, name: "BASS", file: basename(findRawCsv(BASS_ID)), url: psiUrl(BASS_ID), runs: bass.runs, skipped: bass.skipped },
    ...SAFFIRE_FILES.map((f) => ({
      psiId: f.psiId,
      name: f.name,
      file: basename(findRawCsv(f.psiId)),
      url: psiUrl(f.psiId),
      runs: saffire.runs.filter((r) => r.investigationId === f.psiId),
      skipped: saffire.skipped.filter((s) => s.psiId === f.psiId),
    })),
  ];
  return { runs, groups };
}

function main() {
  let result: ReturnType<typeof importAll>;
  try {
    result = importAll();
  } catch (e) {
    console.error(`\n✗ ${(e as Error).message}\n\nNothing written.`);
    process.exit(1);
  }
  const { runs, groups } = result;
  writeFileSync(join(ROOT, "data", "runs.json"), JSON.stringify(runs, null, 2) + "\n");
  writeFileSync(join(ROOT, "pipeline", "psi_import_report.md"), buildCombinedReport(groups));
  for (const g of groups)
    console.log(`  ${g.psiId.padEnd(8)} ${String(g.runs.length).padStart(4)} runs, ${String(g.runs.filter((r) => r.flags.length).length).padStart(4)} flagged, ${g.skipped.length} skipped`);
  console.log(`✓ ${runs.length} runs → data/runs.json; report → pipeline/psi_import_report.md`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
