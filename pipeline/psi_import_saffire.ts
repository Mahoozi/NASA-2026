/**
 * Import the Saffire experiment tables (PSI-98 Saffire-I, PSI-99 Saffire-II,
 * PSI-100 Saffire-III) into typed Run records. One script, three files; the
 * headers differ per file, so each is mapped explicitly.
 *
 *   npx tsx pipeline/psi_import_saffire.ts   (checks only; `npm run import:psi` writes data/runs.json)
 *
 * See pipeline/psi_saffire_columns.md.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { Run } from "../lib/schema";
import type { Skipped } from "./psi_import_bass";
import { collapse, parseCsv } from "./psi_import_bass2";
import {
  checker,
  classifyMaterial,
  findRawCsv,
  mapHeaders,
  NO_CO,
  NO_CO2,
  PI_NOT_STATED,
  psiUrl,
  SHARED_FLAG,
} from "./psi_shared";

export const SAFFIRE_FLAG = {
  o2Approx: (raw: string) => `oxygen approximate in source (raw: ${raw})`,
  o2Range: (raw: string) => `oxygen given as a range in source (raw: ${raw})`,
  thicknessAmbiguous: (raw: string) => `thickness ambiguous in source (raw: ${raw})`,
  thicknessUnit: "thickness unit inconsistent between Saffire tables; not corrected",
} as const;

/** The tables have no date column. */
export const DATE_NOT_STATED = "not stated in table";

type Key =
  | "sample" | "material" | "thickness" | "length" | "width" | "airflow" | "o2"
  | "ignitionPower" | "ignitionTime" | "burnTime" | "direction" | "camera1" | "camera2"
  | "mgBurnLength" | "mgSpread" | "gBurnLength" | "gSpreadRate";

type FileSpec = {
  psiId: string;
  name: string;
  /** Collapsed header text for every column in the file. */
  columns: Partial<Record<Key, string>>;
  /** Units stated in the header, for cells written as bare numbers. */
  headerUnit: Partial<Record<Key, string>>;
  /** Source notes attached to a whole column through its header, e.g. "Percent O2 (Note 1)". */
  headerNotes?: Partial<Record<Key, number>>;
};

export const SAFFIRE_FILES: FileSpec[] = [
  {
    psiId: "PSI-98",
    name: "Saffire-I",
    columns: {
      sample: "Sample Number", material: "Material", thickness: "Sample Thickness (cm)",
      length: "Sample Length (cm)", width: "Sample Width (cm)", airflow: "Air Flow (cm/s)",
      o2: "Percent O2", ignitionPower: "Ignition Power (W)", ignitionTime: "Ignition Time (s)",
      burnTime: "Burn Time (s)", direction: "Flow Direction", camera1: "Camera 1", camera2: "Camera 2",
    },
    headerUnit: { thickness: "cm", length: "cm", width: "cm", airflow: "cm/s", ignitionPower: "W", ignitionTime: "s", burnTime: "s" },
  },
  {
    psiId: "PSI-99",
    name: "Saffire-II",
    columns: {
      sample: "Sample Number", material: "Material", thickness: "Samle Thickness",
      length: "Sample Length", width: "Sample Width (cm)", airflow: "Air Flow (cm/s)",
      o2: "Percent O2 (Note 1)", ignitionPower: "Ignition Power (W)", ignitionTime: "Ignition Time (s)",
      burnTime: "Burn Time (s)", direction: "Flow Direction",
      // "?-g" is how the source file writes it (plain ASCII "?"); the source meant microgravity.
      mgBurnLength: "?-g Burn Length", mgSpread: "?-g Spread Length",
      gBurnLength: "1-g Burn Length", gSpreadRate: "1-g Spread Rate",
      camera1: "Camera 1", camera2: "Camera 2",
    },
    headerUnit: { width: "cm", airflow: "cm/s", ignitionPower: "W", ignitionTime: "s", burnTime: "s" },
    headerNotes: { o2: 1 },
  },
  {
    psiId: "PSI-100",
    name: "Saffire-III",
    columns: {
      sample: "Sample Number", material: "Material", thickness: "Sample Thickness",
      length: "Sample Length", width: "Sample Width", airflow: "Air Flow",
      direction: "Direction", camera1: "Camera 1", camera2: "Camera 2",
    },
    headerUnit: {},
  },
];

/** Observation labels, in the order they are written. */
const OBSERVED: [Key, string][] = [
  ["length", "sample length"],
  ["ignitionPower", "ignition power"],
  ["ignitionTime", "ignition time"],
  ["burnTime", "burn time"],
  ["mgBurnLength", "microgravity burn length"],
  ["mgSpread", "microgravity spread"],
  ["gBurnLength", "1-g burn length"],
  ["gSpreadRate", "1-g spread rate"],
  ["camera1", "camera 1"],
  ["camera2", "camera 2"],
];

const NUM = String.raw`(\d+(?:\.\d+)?|\.\d+)`;
const num = (s: string) => Number(s);
/** ×10 without binary noise (.33 cm → 3.3, not 3.3000000000000003). */
const cmToMm = (s: string) => Number((Number(s) * 10).toFixed(6));

export function parseOxygen(cell: string) {
  const raw = collapse(cell);
  let m: RegExpMatchArray | null;
  if ((m = raw.match(new RegExp(`^~\\s*${NUM}$`))))
    return { initial: num(m[1]), final: null, flags: [SAFFIRE_FLAG.o2Approx(raw)] };
  if ((m = raw.match(new RegExp(`^${NUM} to ${NUM}$`))))
    return { initial: num(m[1]), final: num(m[2]), flags: [] };
  if ((m = raw.match(new RegExp(`^${NUM}\\s*-\\s*${NUM}$`))))
    return { initial: num(m[1]), final: null, flags: [SAFFIRE_FLAG.o2Range(raw)] };
  if ((m = raw.match(new RegExp(`^${NUM}$`)))) return { initial: num(m[1]), final: null, flags: [] };
  throw new Error(`Unrecognised oxygen value: "${cell}"`);
}

/**
 * Thickness in mm. A bare number takes the header unit. "037 mm" (leading
 * zero, no decimal point) is ambiguous; prose and paired values are kept as
 * observations only.
 */
export function parseThickness(cell: string, headerUnit: string | undefined, file: string) {
  const raw = collapse(cell);
  const observe = { label: "sample thickness", value: raw };
  let m: RegExpMatchArray | null;
  if ((m = raw.match(/^(0\d+) mm$/)))
    return { mm: undefined, flags: [SAFFIRE_FLAG.thicknessAmbiguous(raw)], observations: [] };
  if ((m = raw.match(new RegExp(`^${NUM} mm$`)))) return { mm: num(m[1]), flags: [], observations: [] };
  if ((m = raw.match(new RegExp(`^${NUM} cm$`)))) return { mm: cmToMm(m[1]), flags: [], observations: [] };
  if ((m = raw.match(new RegExp(`^${NUM}$`))) && headerUnit === "cm")
    return {
      mm: cmToMm(m[1]),
      // Saffire-I states SIBAL at 0.37 cm; Saffire-II writes 037 mm and Saffire-III .33 cm.
      flags: file === "PSI-98" ? [SAFFIRE_FLAG.thicknessUnit] : [],
      observations: [],
    };
  if (/^see fig/i.test(raw) || / and /.test(raw)) return { mm: undefined, flags: [], observations: [observe] };
  throw new Error(`${file}: unrecognised thickness "${cell}"`);
}

function parseNumberWithUnit(cell: string, unit: string, headerUnit: string | undefined, what: string) {
  const raw = collapse(cell);
  const m = raw.match(new RegExp(`^${NUM}(?:\\s*${unit.replace("/", "\\/")})?$`));
  if (!m || (!raw.endsWith(unit) && headerUnit !== unit))
    throw new Error(`Unrecognised ${what}: "${cell}"`);
  return num(m[1]);
}

function parseDirection(cell: string): Run["flowDirection"] {
  const v = collapse(cell).toLowerCase();
  if (v === "concurrent" || v === "opposed") return v;
  throw new Error(`Unrecognised flow direction: "${cell}"`);
}

const NOTE_REF = /\(?\bnote (\d+)\)?/gi;

export function importSaffireFile(spec: FileSpec): { runs: Run[]; skipped: Skipped[]; notes: Map<number, string> } {
  const path = findRawCsv(spec.psiId);
  const [header, ...body] = parseCsv(readFileSync(path, "utf8"));
  const pos = mapHeaders(header, spec.columns as Record<Key, string>, path);
  const cell = (cells: string[], k: Key) => (pos[k] === undefined ? undefined : collapse(cells[pos[k]] ?? ""));

  // First pass: notes and skipped rows.
  const notes = new Map<number, string>();
  const skipped: Skipped[] = [];
  const testRows: { cells: string[]; line: number }[] = [];
  body.forEach((cells, i) => {
    const line = i + 2;
    const first = collapse(cells[0]);
    const note = first.match(/^note (\d+)\s+(.*)$/i);
    if (note) {
      notes.set(Number(note[1]), note[2]);
      skipped.push({ psiId: spec.psiId, line, text: first, reason: "source note (text kept in pipeline/psi_saffire_columns.md)" });
    } else if (/^F\dC1/i.test(first)) {
      skipped.push({ psiId: spec.psiId, line, text: `${first}: ${collapse(cells[1])}`, reason: "flow visualisation, not a burn" });
    } else if (/^(S\d+|\d+-\d+)$/.test(first)) {
      testRows.push({ cells, line });
    } else throw new Error(`${spec.psiId} line ${line}: unrecognised row "${first}"`);
  });

  let above: { raw: string } | null = null;
  const runs = testRows.map(({ cells, line }): Run => {
    const sample = cell(cells, "sample")!;
    const flags: string[] = [];
    const observations: { label: string; value: string }[] = [];

    // Material: a blank cell takes the row above's text, flagged.
    let raw = cell(cells, "material")!;
    let blank = false;
    if (raw === "") {
      if (!above) throw new Error(`${spec.psiId} line ${line}: blank material on the first row`);
      raw = above.raw;
      blank = true;
    }
    const material = classifyMaterial(raw);
    flags.push(...material.flags);
    if (blank) flags.push(SHARED_FLAG.materialFromRowAbove);
    above = { raw };

    // Oxygen
    let o2Initial: number | null = null;
    let o2Final: number | null = null;
    if (pos.o2 !== undefined) {
      const o2 = parseOxygen(cell(cells, "o2")!);
      o2Initial = o2.initial;
      o2Final = o2.final;
      flags.push(...o2.flags);
    } else flags.push(SHARED_FLAG.oxygenNotRecorded);

    // Dimensions
    const thickness = parseThickness(cell(cells, "thickness")!, spec.headerUnit.thickness, spec.psiId);
    flags.push(...thickness.flags);
    observations.push(...thickness.observations);
    const widthCm = parseNumberWithUnit(cell(cells, "width")!, "cm", spec.headerUnit.width, `${spec.psiId} width`);

    // Airflow
    const airRaw = cell(cells, "airflow")!;
    const air = parseNumberWithUnit(airRaw, "cm/s", spec.headerUnit.airflow, `${spec.psiId} airflow`);

    // Everything else, verbatim.
    for (const [k, label] of OBSERVED) {
      const v = cell(cells, k);
      if (v === undefined || v === "") continue;
      const unit = spec.headerUnit[k];
      observations.push({ label: unit ? `${label} (${unit})` : label, value: v });
    }

    // Source notes: from headers, and from any cell that cites one.
    const cited = new Set<number>(Object.values(spec.headerNotes ?? {}));
    for (const c of cells) for (const m of collapse(c).matchAll(NOTE_REF)) cited.add(Number(m[1]));
    for (const n of [...cited].sort()) {
      const text = notes.get(n);
      if (!text) throw new Error(`${spec.psiId} ${sample}: cites note ${n}, which the table does not contain`);
      observations.push({ label: `source note ${n}`, value: text });
    }

    const run: Run = {
      id: `${spec.psiId}:${sample}`,
      investigationId: spec.psiId,
      pi: PI_NOT_STATED,
      testId: sample,
      date: DATE_NOT_STATED,
      material: {
        family: material.family,
        raw,
        ...(thickness.mm !== undefined ? { thicknessMm: thickness.mm } : {}),
        widthCm,
      },
      o2InitialPct: o2Initial,
      o2FinalPct: o2Final,
      flowCmS: { min: air, max: air, raw: airRaw },
      events: [],
      co2: NO_CO2,
      co: NO_CO,
      flags,
      sourceUrl: psiUrl(spec.psiId),
      flowDirection: parseDirection(cell(cells, "direction")!),
    };
    if (observations.length) run.observations = observations;
    return run;
  });

  return { runs, skipped, notes };
}

export function importSaffire() {
  const results = SAFFIRE_FILES.map((spec) => ({ spec, ...importSaffireFile(spec) }));
  return {
    runs: results.flatMap((r) => r.runs),
    skipped: results.flatMap((r) => r.skipped),
    notes: Object.fromEntries(results.map((r) => [r.spec.psiId, Object.fromEntries(r.notes)])),
  };
}

export function saffireAcceptance(runs: Run[]) {
  const c = checker("Saffire");
  const of = (id: string) => runs.filter((r) => r.investigationId === id);
  const get = (id: string) => runs.find((r) => r.id === id);
  c.check(of("PSI-98").length === 2, `PSI-98: expected 2 runs, got ${of("PSI-98").length}`);
  c.check(of("PSI-99").length === 9, `PSI-99: expected 9 runs, got ${of("PSI-99").length}`);
  c.check(of("PSI-100").length === 2, `PSI-100: expected 2 runs, got ${of("PSI-100").length}`);
  const r26 = get("PSI-99:2-6");
  c.check(!!r26?.flags.includes(SHARED_FLAG.materialFromRowAbove) && r26?.material.family === "SIBAL fabric",
    "PSI-99 2-6 should be SIBAL fabric with the blank-material flag");
  // Amended (decided with the humans): 2-9's blank material is taken from 2-8
  // "PMMA" (no shape word), so it is "other", not "PMMA slab".
  const r29 = get("PSI-99:2-9");
  c.check(r29?.material.family === "other" && r29?.material.thicknessMm === 10 &&
    !!r29?.flags.includes(SHARED_FLAG.materialFromRowAbove) && !!r29?.flags.includes(SHARED_FLAG.pmmaShapeNotStated),
    `PSI-99 2-9 should be "other" (PMMA, shape not stated), taken from the row above, thicknessMm 10`);
  c.check(runs.every((r) => r.o2InitialPct === null || r.o2InitialPct <= 22.2), "a Saffire run has starting oxygen above 22.2");
  c.check(runs.every((r) => r.events.length === 0), "Saffire runs must not carry derived events");
  c.done();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { runs, skipped } = importSaffire();
  saffireAcceptance(runs);
  for (const id of ["PSI-98", "PSI-99", "PSI-100"]) {
    const rs = runs.filter((r) => r.investigationId === id);
    console.log(`✓ ${id}: ${rs.length} runs, ${rs.filter((r) => r.flags.length).length} flagged, ${skipped.filter((s) => s.psiId === id).length} rows skipped (checks only; nothing written)`);
  }
}
