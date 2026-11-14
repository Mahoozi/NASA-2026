/**
 * Import the PSI-26 (BASS) experiment table into typed Run records.
 *
 *   npx tsx pipeline/psi_import_bass.ts   (checks only; `npm run import:psi` writes data/runs.json)
 *
 * The table records test bookkeeping and the sample only: no oxygen, airflow,
 * CO2, CO or outcome columns. See pipeline/psi_bass_columns.md.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { Run } from "../lib/schema";
import { collapse, parseCsv } from "./psi_import_bass2";
import {
  checker,
  classifyMaterial,
  findRawCsv,
  gmtFlags,
  mapHeaders,
  NO_CO,
  NO_CO2,
  NO_FLOW,
  parseLooseDate,
  PI_NOT_STATED,
  psiUrl,
  SHARED_FLAG,
} from "./psi_shared";

export const BASS_ID = "PSI-26";

export const BASS_FLAG = {
  oppsed: "unrecognised note 'oppsed' in material column; flow direction not set",
} as const;

const COLUMNS = {
  date: "Date",
  gmt: "GMT",
  asRun: "As Run Test #",
  test: "Test #",
  sample: "Sample #",
  material: "Fuel Sample Material",
} as const;

type Row = Record<keyof typeof COLUMNS, string> & { line: number };

export type Skipped = { psiId: string; line: number; text: string; reason: string };

/** Notes the crew wrote into the material column, longest phrase first. */
const NOTE_RE = /\b(wake ign|wake|opposed flow|opposed|oppsed)\b/gi;

export function materialNotes(raw: string) {
  const phrases = [...collapse(raw).matchAll(NOTE_RE)].map((m) => m[1]);
  const observations = phrases.map((value) => ({ label: "note in material column", value }));
  const lc = phrases.map((p) => p.toLowerCase());
  const flowDirection = lc.some((p) => p === "opposed" || p === "opposed flow")
    ? ("opposed" as const)
    : undefined;
  const flags = lc.includes("oppsed") ? [BASS_FLAG.oppsed] : [];
  return { observations, flowDirection, flags };
}

export function loadBassRows(path = findRawCsv(BASS_ID)): Row[] {
  const [header, ...body] = parseCsv(readFileSync(path, "utf8"));
  const pos = mapHeaders(header, COLUMNS, path);
  return body.map((cells, i) => {
    const r = { line: i + 2 } as Row;
    for (const k of Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]) r[k] = cells[pos[k]] ?? "";
    return r;
  });
}

export function importBass(rows = loadBassRows()): { runs: Run[]; skipped: Skipped[] } {
  const skipped: Skipped[] = [];
  const testRows: Row[] = [];
  for (const r of rows) {
    if (collapse(r.test) === "" && collapse(r.asRun) === "") {
      if (!/soot cleaning/i.test(r.material))
        throw new Error(`PSI-26 line ${r.line}: row without test numbers: "${r.material}"`);
      skipped.push({ psiId: BASS_ID, line: r.line, text: collapse(r.material), reason: "no test number (maintenance row)" });
      continue;
    }
    if (collapse(r.test) === "" || collapse(r.asRun) === "")
      throw new Error(`PSI-26 line ${r.line}: missing As Run or Test number`);
    testRows.push(r);
  }

  const bySample = new Map<string, Row[]>();
  for (const r of testRows) {
    const k = collapse(r.sample);
    bySample.set(k, [...(bySample.get(k) ?? []), r]);
  }

  const runs = testRows.map((r): Run => {
    const raw = collapse(r.material);
    if (raw === "") throw new Error(`PSI-26 line ${r.line}: blank material`);
    const siblings = (bySample.get(collapse(r.sample)) ?? []).filter((s) => s !== r).map((s) => s.material);
    const material = classifyMaterial(raw, siblings);
    const notes = materialNotes(raw);
    const date = parseLooseDate(r.date);

    const run: Run = {
      id: `${BASS_ID}:r${collapse(r.asRun)}-t${collapse(r.test)}`,
      investigationId: BASS_ID,
      pi: PI_NOT_STATED,
      testId: collapse(r.test),
      date: date.date,
      material: { family: material.family, raw },
      o2InitialPct: null,
      o2FinalPct: null,
      flowCmS: NO_FLOW,
      events: [],
      co2: NO_CO2,
      co: NO_CO,
      flags: [
        ...material.flags,
        ...notes.flags,
        ...date.flags,
        ...gmtFlags(date, r.gmt),
        SHARED_FLAG.oxygenNotRecorded,
        SHARED_FLAG.airflowNotRecorded,
      ],
      sourceUrl: psiUrl(BASS_ID),
    };
    if (notes.flowDirection) run.flowDirection = notes.flowDirection;
    if (notes.observations.length) run.observations = notes.observations;
    return run;
  });

  return { runs, skipped };
}

export function bassAcceptance(runs: Run[], skipped: Skipped[]) {
  const c = checker("PSI-26 (BASS)");
  const asRun = (n: number) => runs.filter((r) => r.id.startsWith(`${BASS_ID}:r${n}-`));
  c.check(runs.length === 121, `expected 121 runs, got ${runs.length}`);
  c.check(new Set(runs.map((r) => r.id)).size === runs.length, "run ids are not unique");
  c.check(skipped.length === 1 && /soot cleaning/i.test(skipped[0]?.text ?? ""), "expected exactly the SOOT Cleaning row to be skipped");
  const backtick = runs.filter((r) => r.date === "6/29/`12");
  c.check(backtick.length === 1 && backtick[0].flags.includes(SHARED_FLAG.dateUnparseable), `the "6/29/\`12" row should carry the unparseable-date flag`);
  const y2103 = runs.filter((r) => r.date.startsWith("2103-"));
  c.check(y2103.length === 1 && y2103[0].flags.includes(SHARED_FLAG.dateYearImplausible), "the 2103 row should carry the implausible-year flag");
  const r93 = asRun(93);
  c.check(r93.length === 1 && r93[0].date === "2013-04-26" && r93[0].flags.includes(SHARED_FLAG.dateGmt), "As Run 93 (4/26/2013, GMT 113) should carry the date/GMT flag");
  c.check(runs.every((r) => r.o2InitialPct === null && r.flowCmS.min === null && r.flowCmS.max === null), "every PSI-26 run should have null oxygen and airflow");
  c.done();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { runs, skipped } = importBass();
  bassAcceptance(runs, skipped);
  console.log(`✓ PSI-26: ${runs.length} runs, ${skipped.length} skipped, ${runs.filter((r) => r.flags.length).length} flagged (checks only; nothing written)`);
}
