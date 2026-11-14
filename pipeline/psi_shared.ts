/**
 * Rules shared by the BASS (PSI-26) and Saffire (PSI-98/99/100) importers.
 * The BASS-II importer (psi_import_bass2.ts) keeps its own material rules.
 *
 * Principles: one Run per test row; values are never corrected or filled in;
 * a value that can't be trusted is null plus a flag; anything unrecognised
 * throws.
 */
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { MaterialFamily, Run } from "../lib/schema";
import { collapse, dayOfYear } from "./psi_import_bass2";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const RAW_DIR = join(ROOT, "data", "raw");

export const psiUrl = (psiId: string) =>
  `https://psi.nasa.gov/physci/repo/data/investigations/${psiId}`;

export const SHARED_FLAG = {
  oxygenNotRecorded: "oxygen not recorded in this table",
  airflowNotRecorded: "airflow not recorded in this table",
  sphereInferredPmma: "material inferred as PMMA from sibling rows",
  shapeFromSampleNumber: "shape inferred from rows sharing the sample number",
  pmmaShapeNotStated: "PMMA, shape not stated",
  materialFromRowAbove: "material blank in source; taken from the row above",
  dateUnparseable: "date unparseable in source",
  dateYearImplausible: "date year implausible in source",
  dateGmt: "date and GMT day disagree in source",
} as const;

/** The table carries no PI column. */
export const PI_NOT_STATED = "not stated in table";

/** Find a raw table by PSI id, tolerating "_" or " " after the id. Never renames. */
export function findRawCsv(psiId: string, dir = RAW_DIR): string {
  const re = new RegExp(`^${psiId.replace("-", "\\-")}[_ ].*\\.csv$`, "i");
  const hits = readdirSync(dir).filter((f) => re.test(f));
  if (hits.length !== 1)
    throw new Error(`Expected one ${psiId} CSV in ${dir}, found: ${hits.join(", ") || "none"}`);
  return join(dir, hits[0]);
}

/**
 * Map a header row to known column keys after collapsing whitespace. Every
 * header must be mapped; an unknown or missing one throws.
 */
export function mapHeaders<K extends string>(
  header: string[],
  mapping: Record<K, string>,
  file: string,
): Record<K, number> {
  const names = header.map((h) => collapse(h));
  const byName = new Map(names.map((n, i) => [n, i]));
  const pos = {} as Record<K, number>;
  for (const [key, name] of Object.entries(mapping) as [K, string][]) {
    const i = byName.get(name);
    if (i === undefined) throw new Error(`${file}: missing column "${name}" (have: ${names.join(" | ")})`);
    pos[key] = i;
  }
  const known = new Set(Object.values(mapping));
  const unknown = names.filter((n) => n !== "" && !known.has(n));
  if (unknown.length) throw new Error(`${file}: unrecognised columns: ${unknown.join(" | ")}`);
  return pos;
}

// ---------------------------------------------------------------------------
// Material family
// ---------------------------------------------------------------------------

/** Materials that are knowingly "other" (no family in the schema). */
const KNOWN_OTHER = [/silicone/i, /ultem/i, /pmma\s*&\s*nomex/i];

/**
 * Family for BASS and Saffire material text.
 * @param siblingRaws material text of other rows sharing this row's sample number
 */
export function classifyMaterial(
  rawCell: string,
  siblingRaws: string[] = [],
): { family: MaterialFamily; flags: string[] } {
  const lc = collapse(rawCell).toLowerCase();
  const has = (w: string) => lc.includes(w);
  const pmma = has("pmma");
  const nomex = has("nomex");

  if (has("sibal")) return { family: "SIBAL fabric", flags: [] };
  if (nomex && !pmma) return { family: "Nomex", flags: [] };
  if (has("wax") || has("candle")) return { family: "wax", flags: [] };
  if (pmma && has("slab")) return { family: "PMMA slab", flags: [] };
  if (pmma && has("sphere")) return { family: "PMMA sphere", flags: [] };
  if (has("sphere")) return { family: "PMMA sphere", flags: [SHARED_FLAG.sphereInferredPmma] };
  if (pmma && !nomex) {
    if (/\b(rod|film|sheet|cylinder)\b/.test(lc))
      throw new Error(`PMMA shape word not covered by the rules: "${rawCell}"`);
    return siblingRaws.some((s) => /sphere/i.test(s))
      ? { family: "PMMA sphere", flags: [SHARED_FLAG.shapeFromSampleNumber] }
      : { family: "other", flags: [SHARED_FLAG.pmmaShapeNotStated] };
  }
  if (KNOWN_OTHER.some((re) => re.test(lc))) return { family: "other", flags: [] };
  throw new Error(`Unrecognised material: "${rawCell}"`);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export const YEAR_MIN = 2008;
export const YEAR_MAX = 2020;

/** m/d/yyyy → ISO. Unparseable → raw text kept + flag. Odd year → flag, kept. */
export function parseLooseDate(raw: string): { date: string; iso: boolean; flags: string[] } {
  const s = collapse(raw);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return { date: s, iso: false, flags: [SHARED_FLAG.dateUnparseable] };
  const [, mo, d, y] = m;
  const flags: string[] = [];
  if (Number(y) < YEAR_MIN || Number(y) > YEAR_MAX) flags.push(SHARED_FLAG.dateYearImplausible);
  return { date: `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`, iso: true, flags };
}

/** Day-of-year check against a GMT column; only for parseable dates. */
export function gmtFlags(date: { date: string; iso: boolean }, gmtRaw: string): string[] {
  const gmt = collapse(gmtRaw);
  if (!date.iso || gmt === "") return [];
  if (!/^\d+$/.test(gmt)) throw new Error(`Unexpected GMT value: "${gmtRaw}"`);
  return dayOfYear(date.date) === Number(gmt) ? [] : [SHARED_FLAG.dateGmt];
}

// ---------------------------------------------------------------------------
// Run defaults for tables that record less than BASS-II
// ---------------------------------------------------------------------------

export const NO_CO2: Run["co2"] = { initialPct: null, finalPct: null };
export const NO_CO: Run["co"] = { initialPpm: null, finalPpm: null, raw: "" };
export const NO_FLOW: Run["flowCmS"] = { min: null, max: null, raw: "" };

/** Assert helper: collects failures, throws once with all of them. */
export function checker(name: string) {
  const fails: string[] = [];
  return {
    check(ok: boolean, msg: string) {
      if (!ok) fails.push(msg);
    },
    fails,
    done() {
      if (fails.length)
        throw new Error(`${name}: ${fails.length} acceptance check(s) failed:\n  - ${fails.join("\n  - ")}`);
    },
  };
}
