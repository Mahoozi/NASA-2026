/**
 * Import the PSI-25 (BASS-II) experimental table into typed Run records.
 *
 *   npm run import:psi
 *
 * Reads  data/raw/PSI-25_Experimental table_BASS-II.csv  (never modified)
 * Writes data/runs.json and pipeline/psi_import_report.md
 *
 * One Run per CSV row. Values are never dropped, corrected, averaged or
 * filled in; anything doubtful is kept as-is (or set to null) and flagged.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { MaterialFamily, Run } from "../lib/schema";

export const INVESTIGATION_ID = "PSI-25";
export const SOURCE_URL =
  "https://psi.nasa.gov/physci/repo/data/investigations/PSI-25";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = join(ROOT, "data", "raw");

// ---------------------------------------------------------------------------
// Flags (exact wording is part of the contract; tests and the UI rely on it)
// ---------------------------------------------------------------------------
export const FLAG = {
  spherical: "spherical sample: material not stated in table",
  inferredPmma: "material inferred as PMMA from sibling rows",
  finalO2Implausible: (raw: string) =>
    `final O2 implausible in source (raw: ${raw})`,
  belowOne: "airflow below 1 cm/s at some point",
  swapped: "fan and airflow values appear swapped in source",
  above40: "airflow above the 40 cm/s tunnel maximum stated by PSI",
  potInAir: "airflow partly recorded as fan pot setting; minimum uncertain",
  airNotNumeric: "airflow not numeric in source",
  coOverRange: "CO over range in source",
  coNegative: "negative CO reading (sensor offset)",
  dateGmt: "date and GMT day disagree in source",
  yearInconsistent:
    "date year inconsistent with sibling rows (year appears nowhere else in table)",
} as const;

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
export const collapse = (s: string | undefined): string =>
  (s ?? "").replace(/\s+/g, " ").trim();

/** Minimal RFC 4180 parser: quoted fields, "" escapes, CRLF/LF. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/** Canonical column names, matched after collapsing whitespace and trimming. */
export const COLUMNS = {
  pi: "PI",
  test: "Test #",
  date: "Date",
  gmt: "GMT",
  material: "Fuel Sample Material",
  fan: "Fan display",
  air: "Air display",
  o2Initial: "Calibrated initial O2 % by vol",
  o2Final: "Calibrated final O2 % by vol",
  co2Initial: "Initial CO2 % by vol",
  co2Final: "Final CO2 % by vol",
  coInitial: "Initial CO (ppm)",
  coFinal: "Final CO (ppm)",
} as const;

export type RawRow = Record<keyof typeof COLUMNS, string>;

export function toRawRows(table: string[][]): RawRow[] {
  const [header, ...body] = table;
  const index = new Map(header.map((h, i) => [collapse(h), i]));
  const pos = {} as Record<keyof typeof COLUMNS, number>;
  for (const [key, name] of Object.entries(COLUMNS)) {
    const i = index.get(name);
    if (i === undefined) throw new Error(`Missing column "${name}" in CSV header`);
    pos[key as keyof typeof COLUMNS] = i;
  }
  return body.map((cells) => {
    const r = {} as RawRow;
    for (const key of Object.keys(COLUMNS) as (keyof typeof COLUMNS)[])
      r[key] = cells[pos[key]] ?? "";
    return r;
  });
}

export function findCsv(dir = RAW_DIR): string {
  const hits = readdirSync(dir).filter(
    (f) => /^PSI-25.*BASS-II.*\.csv$/i.test(f),
  );
  if (hits.length !== 1)
    throw new Error(`Expected one PSI-25 BASS-II CSV in ${dir}, found: ${hits.join(", ") || "none"}`);
  return join(dir, hits[0]);
}

export function loadRawRows(path = findCsv()): RawRow[] {
  return toRawRows(parseCsv(readFileSync(path, "utf8")));
}

// ---------------------------------------------------------------------------
// Field parsers
// ---------------------------------------------------------------------------
const NUM = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/;

/** Plain numeric cell. "none" or blank → null. Anything else is a hard error. */
export function parseNumber(raw: string, field: string): number | null {
  const s = collapse(raw);
  if (s === "" || /^none$/i.test(s)) return null;
  if (NUM.test(s)) return Number(s);
  throw new Error(`Unexpected non-numeric ${field}: "${raw}"`);
}

/** m/d/yyyy → yyyy-mm-dd */
export function parseDate(raw: string): string {
  const m = collapse(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) throw new Error(`Unexpected date: "${raw}"`);
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function dayOfYear(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000;
}

export type ParsedMaterial = {
  material: Run["material"];
  flags: string[];
};

const PMMA_FAMILIES: MaterialFamily[] = [
  "PMMA film", "PMMA slab", "PMMA rod", "PMMA sphere",
];

export function parseMaterial(rawCell: string): ParsedMaterial {
  const raw = collapse(rawCell);
  const lc = raw.toLowerCase();
  const flags: string[] = [];

  let thicknessMm: number | undefined;
  const micron = raw.match(/(\d+(?:\.\d+)?)\s*micron/i);
  const mm = raw.match(/(\d+(?:\.\d+)?)\s*mm\b/i);
  if (micron) thicknessMm = Number(micron[1]) / 1000;
  else if (mm) thicknessMm = Number(mm[1]);

  const cm = raw.match(/(\d+(?:\.\d+)?)\s*cm\b/i);
  const widthCm = cm ? Number(cm[1]) : undefined;

  const DIAMETERS: Record<string, number> = {
    "1/4": 0.25, "3/8": 0.375, "1/2": 0.5, "0.5": 0.5,
  };
  const dia = raw.match(/(?<![\d.])(1\/4|3\/8|1\/2|0\.5)(?!\d|\s*mm|\s*cm)/);
  const diameterIn = dia ? DIAMETERS[dia[1]] : undefined;

  let family: MaterialFamily;
  if (lc.includes("sibal")) family = "SIBAL fabric";
  else if (lc.includes("nomex")) family = "Nomex";
  else if (lc.includes("wax")) family = "wax";
  else if (lc.includes("spherical")) {
    family = "other";
    flags.push(FLAG.spherical);
  } else if (lc.includes("rod")) family = "PMMA rod";
  else if (lc.includes("film") || lc.includes("micron") ||
           (thicknessMm !== undefined && thicknessMm <= 0.5))
    family = "PMMA film";
  else if (lc.includes("slab") || lc.includes("sided") ||
           (thicknessMm !== undefined && thicknessMm >= 1))
    family = "PMMA slab";
  else family = "other";

  if (PMMA_FAMILIES.includes(family) && !lc.includes("pmma"))
    flags.push(FLAG.inferredPmma);

  const material: Run["material"] = { family, raw };
  if (thicknessMm !== undefined) material.thicknessMm = thicknessMm;
  // A "<n> cm" on an unidentified sample (e.g. "4 cm spherical section")
  // is not known to be a width, so it is not recorded as one.
  if (widthCm !== undefined && family !== "other") material.widthCm = widthCm;
  if (diameterIn !== undefined) material.diameterIn = diameterIn;
  return { material, flags };
}

export function parseO2(initialRaw: string, finalRaw: string) {
  const initial = parseNumber(initialRaw, "initial O2");
  let final = parseNumber(finalRaw, "final O2");
  const flags: string[] = [];
  if (
    final !== null &&
    (final < 10 || final > 25 || (initial !== null && final > initial + 0.5))
  ) {
    flags.push(FLAG.finalO2Implausible(collapse(finalRaw)));
    final = null;
  }
  return { initial, final, flags };
}

const NUMBER_RE = /\d+(?:\.\d+)?|\.\d+/g;

/**
 * Numbers outside parentheses, dropping any number immediately followed by
 * "pot" and every number after the word "pot" or "pots".
 */
function airNumbersOutsideParens(text: string) {
  const tokens = [
    ...text.matchAll(/(<\s*)?(\d+(?:\.\d+)?|\.\d+)|([a-z]+)/gi),
  ].map((m) =>
    m[3] !== undefined
      ? { kind: "word" as const, word: m[3].toLowerCase() }
      : { kind: "num" as const, value: Number(m[2]), lt: m[1] !== undefined },
  );
  const isPot = (t: (typeof tokens)[number] | undefined) =>
    t?.kind === "word" && (t.word === "pot" || t.word === "pots");

  const values: number[] = [];
  let belowOne = false;
  let afterPot = false;
  tokens.forEach((t, i) => {
    if (t.kind === "word") {
      if (isPot(t)) afterPot = true;
      return;
    }
    // Rule wording: drop a number immediately followed by "pot" (singular),
    // and every number after the word "pot" or "pots".
    const next = tokens[i + 1];
    if (afterPot || (next?.kind === "word" && next.word === "pot")) return;
    if (t.lt) {
      if (t.value !== 1) throw new Error(`Unexpected "<${t.value}" in Air display: "${text}"`);
      belowOne = true;
    }
    values.push(t.value);
  });
  return { values, belowOne };
}

export function parseAirflow(airCell: string) {
  const air = collapse(airCell);
  const flags: string[] = [];
  let min: number | null = null;
  let max: number | null = null;

  const cms = air.match(/(\d+(?:\.\d+)?)\s*cm\/s/i);
  if (cms) {
    min = max = Number(cms[1]);
  } else {
    const outside = air.replace(/\([^)]*\)/g, " ");
    const inside = [...air.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).join(" ");
    const { values, belowOne } = airNumbersOutsideParens(outside);

    let chosen = values;
    let chosenBelowOne = belowOne;
    let swapped = false;
    if (values.length && Math.max(...values) > 40) {
      const paren = (inside.match(NUMBER_RE) ?? []).map(Number);
      if (paren.length && paren.every((n) => n <= 40)) {
        chosen = paren;
        chosenBelowOne = false;
        swapped = true;
      }
    }

    if (chosen.length) {
      min = Math.min(...chosen);
      max = Math.max(...chosen);
      if (chosenBelowOne) flags.push(FLAG.belowOne);
      if (swapped) flags.push(FLAG.swapped);
      if (max > 40) flags.push(FLAG.above40);
    }
  }

  if (/pot/i.test(air)) flags.push(FLAG.potInAir);
  if (min === null) flags.push(FLAG.airNotNumeric);
  return { min, max, flags };
}

export function parseEvents(fan: string, air: string): Run["events"] {
  const text = `${fan} ${air}`.toLowerCase();
  const events: Run["events"] = [];
  if (text.includes("ext") || /\bout\b/.test(text)) events.push("extinction");
  if (text.includes("blowoff")) events.push("blowoff");
  if (text.includes("no ign") || text.includes("would not stay lit"))
    events.push("no-ignition");
  return events;
}

export function parseCo(initialRaw: string, finalRaw: string) {
  const flags: string[] = [];
  const one = (raw: string, field: string): number | null => {
    const s = collapse(raw);
    if (/^(or|over)$/i.test(s) || s === ">500") {
      flags.push(FLAG.coOverRange);
      return null;
    }
    const n = parseNumber(s, field);
    if (n !== null && n < 0) flags.push(FLAG.coNegative);
    return n;
  };
  const initialPpm = one(initialRaw, "initial CO");
  const finalPpm = one(finalRaw, "final CO");
  return {
    co: {
      initialPpm,
      finalPpm,
      raw: `${collapse(initialRaw)} → ${collapse(finalRaw)}`,
    },
    flags,
  };
}

// ---------------------------------------------------------------------------
// Row → Run
// ---------------------------------------------------------------------------
export function rowToRun(r: RawRow): Run {
  const testId = collapse(r.test);
  const date = parseDate(r.date);
  const { material, flags: materialFlags } = parseMaterial(r.material);
  const o2 = parseO2(r.o2Initial, r.o2Final);
  const air = parseAirflow(r.air);
  const co = parseCo(r.coInitial, r.coFinal);

  const flags = [...materialFlags, ...o2.flags, ...air.flags, ...co.flags];
  const gmt = parseNumber(r.gmt, "GMT");
  if (gmt !== null && dayOfYear(date) !== gmt) flags.push(FLAG.dateGmt);

  return {
    id: `${INVESTIGATION_ID}:${testId}`,
    investigationId: INVESTIGATION_ID,
    pi: collapse(r.pi),
    testId,
    date,
    material,
    o2InitialPct: o2.initial,
    o2FinalPct: o2.final,
    flowCmS: {
      min: air.min,
      max: air.max,
      raw: collapse(`fan: ${collapse(r.fan)} | air: ${collapse(r.air)}`),
    },
    events: parseEvents(r.fan, r.air),
    co2: {
      initialPct: parseNumber(r.co2Initial, "initial CO2"),
      finalPct: parseNumber(r.co2Final, "final CO2"),
    },
    co: co.co,
    flags: [...new Set(flags)],
    sourceUrl: SOURCE_URL,
  };
}

/**
 * Within a group of rows sharing a GMT day that holds more than one year,
 * flag each row whose year appears in no row outside that group.
 * (Example: GMT 175 holds F4/T10 in 2014 and T9/T18 in 2018; 2018 occurs
 * nowhere else in the table, so T9 and T18 are flagged.)
 */
export function flagYearInconsistency(rows: RawRow[], runs: Run[]): void {
  const year = (i: number) => runs[i].date.slice(0, 4);
  const groups = new Map<string, number[]>();
  rows.forEach((r, i) => {
    const key = collapse(r.gmt);
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });
  for (const idx of groups.values()) {
    const inGroup = new Set(idx);
    if (new Set(idx.map(year)).size < 2) continue;
    for (const i of idx) {
      const elsewhere = runs.some((_, j) => !inGroup.has(j) && year(j) === year(i));
      if (!elsewhere) runs[i].flags.push(FLAG.yearInconsistent);
    }
  }
}

export function importRuns(rows: RawRow[]): Run[] {
  const runs = rows.map(rowToRun);
  flagYearInconsistency(rows, runs);
  return runs;
}

// ---------------------------------------------------------------------------
// Acceptance checks
// ---------------------------------------------------------------------------
export function acceptanceFailures(runs: Run[]): string[] {
  const fails: string[] = [];
  const check = (ok: boolean, msg: string) => { if (!ok) fails.push(msg); };
  const by = new Map(runs.map((r) => [r.testId, r]));
  const get = (id: string) => {
    const r = by.get(id);
    if (!r) fails.push(`missing test ${id}`);
    return r;
  };

  check(runs.length === 129, `expected 129 runs, got ${runs.length}`);

  const perPi: Record<string, number> = {
    Bhattacharjee: 22, Ferkul: 4, Miller: 20, Olson: 27,
    "Fernandez-Pello": 27, "T'ien": 29,
  };
  for (const [pi, n] of Object.entries(perPi)) {
    const got = runs.filter((r) => r.pi === pi).length;
    check(got === n, `PI ${pi}: expected ${n} rows, got ${got}`);
  }

  const o2 = runs.map((r) => r.o2InitialPct).filter((v): v is number => v !== null);
  const minO2 = Math.min(...o2);
  check(minO2 === 13.6, `min initial O2 expected 13.6, got ${minO2}`);
  check(get("O12")?.o2InitialPct === 13.6, `O12 initial O2 expected 13.6`);
  check(Math.max(...o2) === 22.2, `max initial O2 expected 22.2, got ${Math.max(...o2)}`);
  check(o2.every((v) => v < 23), `a run has initial O2 >= 23`);

  const hasEvent = (id: string, e: Run["events"][number]) =>
    check(!!get(id)?.events.includes(e), `${id} should have event "${e}" (has: ${get(id)?.events.join(", ") || "none"})`);
  hasEvent("O12", "no-ignition");
  hasEvent("B18", "blowoff");
  hasEvent("B14", "extinction");
  hasEvent("P8", "no-ignition");

  const o5b = get("O5b");
  check(o5b?.flowCmS.min === 5 && o5b?.flowCmS.max === 5,
    `O5b flow expected 5–5, got ${o5b?.flowCmS.min}–${o5b?.flowCmS.max}`);
  const o13a = get("O13a");
  check(o13a?.flowCmS.max === 5 && !!o13a?.flags.includes(FLAG.swapped),
    `O13a expected max 5 with swapped flag, got max ${o13a?.flowCmS.max}, flags [${o13a?.flags.join("; ")}]`);
  const t17 = get("T17");
  check(t17?.flowCmS.max === 53 && !!t17?.flags.includes(FLAG.above40),
    `T17 expected max 53 with above-40 flag, got max ${t17?.flowCmS.max}, flags [${t17?.flags.join("; ")}]`);

  for (const id of ["B2", "P22a", "P22b", "T28a", "T28b"]) {
    const r = get(id);
    check(r?.o2FinalPct === null &&
      !!r?.flags.some((f) => f.startsWith("final O2 implausible in source")),
      `${id} expected final O2 null with implausible flag`);
  }
  for (const id of ["T9", "T18"])
    check(!!get(id)?.flags.includes(FLAG.yearInconsistent),
      `${id} expected flag "${FLAG.yearInconsistent}"`);
  for (const id of ["O20", "O21", "O22"])
    check(!get(id)?.flags.includes(FLAG.yearInconsistent),
      `${id} must not carry the year-inconsistent flag`);
  const p4 = get("P4");
  check(p4?.flowCmS.min === 5 && p4?.flowCmS.max === 5 && !!p4?.flags.includes(FLAG.potInAir),
    `P4 expected flow 5–5 with pot flag, got ${p4?.flowCmS.min}–${p4?.flowCmS.max}, flags [${p4?.flags.join("; ")}]`);
  check(!!get("O10")?.flags.includes(FLAG.dateGmt),
    `O10 expected flag "${FLAG.dateGmt}"`);

  return fails;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
export function buildReport(runs: Run[], csvName: string): string {
  const count = <T,>(items: T[]) => {
    const m = new Map<T, number>();
    for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
    return m;
  };
  const table = (head: [string, string], rows: [string, number][]) =>
    [`| ${head[0]} | ${head[1]} |`, "|---|---:|", ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join("\n");

  const pis = [...count(runs.map((r) => r.pi))];
  const fams = [...count(runs.map((r) => r.material.family))].sort((a, b) => b[1] - a[1]);

  const bands: [string, (v: number) => boolean][] = [
    ["< 15", (v) => v < 15],
    ["15–17", (v) => v >= 15 && v < 17],
    ["17–19", (v) => v >= 17 && v < 19],
    ["19–21", (v) => v >= 19 && v < 21],
    ["21–23", (v) => v >= 21 && v < 23],
    ["≥ 23", (v) => v >= 23],
  ];
  const o2Rows: [string, number][] = bands.map(([label, f]) => [
    label, runs.filter((r) => r.o2InitialPct !== null && f(r.o2InitialPct)).length,
  ]);
  const noO2 = runs.filter((r) => r.o2InitialPct === null).length;
  if (noO2) o2Rows.push(["not recorded", noO2]);

  const eventRows: [string, number][] = (["extinction", "blowoff", "no-ignition"] as const)
    .map((e) => [e, runs.filter((r) => r.events.includes(e)).length]);
  eventRows.push(["no event keyword", runs.filter((r) => r.events.length === 0).length]);

  const flagged = runs.filter((r) => r.flags.length);
  const flagCounts = [...count(runs.flatMap((r) =>
    r.flags.map((f) => f.startsWith("final O2 implausible") ? "final O2 implausible in source (raw: …)" : f),
  ))].sort((a, b) => b[1] - a[1]);

  return `# PSI-25 (BASS-II) import report

Generated by \`npm run import:psi\` from \`data/raw/${csvName}\`.
Do not edit by hand.

- Runs: **${runs.length}**
- Flagged runs: **${flagged.length}**

## Runs per PI

${table(["PI", "Runs"], pis)}

## Runs per material family

${table(["Family", "Runs"], fams)}

## Runs per initial O2 band (% by volume)

Bands are lower-inclusive (15–17 means 15 ≤ O2 < 17).

${table(["Initial O2", "Runs"], o2Rows)}

## Events (keywords in the fan/air text)

A run can have more than one event.

${table(["Event", "Runs"], eventRows)}

## Flag totals

${table(["Flag", "Runs"], flagCounts)}

## Flags by test

| Test | Flags |
|---|---|
${flagged.map((r) => `| ${r.testId} | ${r.flags.join("; ")} |`).join("\n")}
`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function main() {
  const csv = findCsv();
  const runs = importRuns(loadRawRows(csv));
  const fails = acceptanceFailures(runs);
  if (fails.length) {
    console.error(`\n✗ ${fails.length} acceptance check(s) failed; nothing written:\n`);
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }
  writeFileSync(join(ROOT, "data", "runs.json"), JSON.stringify(runs, null, 2) + "\n");
  writeFileSync(join(ROOT, "pipeline", "psi_import_report.md"),
    buildReport(runs, csv.split("/").pop()!));
  console.log(`✓ ${runs.length} runs → data/runs.json; report → pipeline/psi_import_report.md`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
