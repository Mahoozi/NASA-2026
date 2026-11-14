// Person A — recorded flammability limits from the BASS-II (PSI-25) table. Pure.
// A limit point is a run whose table row records an event keyword (extinction,
// blowoff, no ignition) together with the airflow step it happened at. Nothing is
// fitted, interpolated or extrapolated; ambiguous rows are excluded with a reason.
// Every point is re-checked against data/raw by pipeline/limits_report.ts.
import type { MaterialFamily, Run, Scenario } from "./schema";

export const LIMITS_INVESTIGATION = "PSI-25";
export type LimitEvent = Run["events"][number];

/**
 * How the flow value relates to the event:
 * - "at": the raw airflow text puts the keyword right after this step ("5 3 2 ext").
 * - "below": the flow was lowered further on fan settings that were not converted
 *   to cm/s ("5 down to ext"), so the event happened below this step.
 * - "across": no ignition at any recorded step from flowCmS to flowMaxCmS.
 */
export type FlowRelation = "at" | "below" | "across";

export type LimitPoint = {
  runId: string;
  testId: string;
  family: MaterialFamily;
  event: LimitEvent;
  o2Pct: number;
  o2FinalPct: number | null;
  flowCmS: number;
  flowMaxCmS?: number;
  relation: FlowRelation;
  rawFlow: string;
  flags: string[];
};

export type LimitExclusion = {
  runId: string;
  testId: string;
  family: MaterialFamily;
  event: LimitEvent;
  reason: string;
  rawFlow: string;
  flags: string[];
};

export const EXCLUSION = {
  noO2: "starting oxygen not recorded",
  twoEvents: "extinction and blowoff recorded in one run; the order of the flow steps is ambiguous",
  notNumeric: "airflow at the event recorded only as fan settings, not in cm/s",
  minUncertain: "airflow partly recorded as fan pot setting; minimum uncertain",
  extinctionStep: "raw airflow text does not say at which step the flame went out",
  blowoffStep: "blowoff followed fan changes that were not recorded in cm/s",
} as const;

const MIN_UNCERTAIN_FLAG = "airflow partly recorded as fan pot setting; minimum uncertain";

/** The "air:" part of a BASS-II flowCmS.raw ("fan: … | air: …"). */
export const airText = (raw: string) => raw.split("| air:")[1]?.trim() ?? "";

/** Every (run, event) pair in the limits table, before any exclusion. */
export function limitCandidates(runs: Run[]): { run: Run; event: LimitEvent }[] {
  return runs
    .filter((r) => r.investigationId === LIMITS_INVESTIGATION)
    .flatMap((run) => run.events.map((event) => ({ run, event })));
}

export function limitPoints(runs: Run[]): { points: LimitPoint[]; excluded: LimitExclusion[] } {
  const points: LimitPoint[] = [];
  const excluded: LimitExclusion[] = [];
  for (const { run, event } of limitCandidates(runs)) {
    const base = {
      runId: run.id,
      testId: run.testId,
      family: run.material.family,
      event,
      rawFlow: run.flowCmS.raw,
      flags: run.flags,
    };
    const exclude = (reason: string) => excluded.push({ ...base, reason });
    const { min, max } = run.flowCmS;
    const air = airText(run.flowCmS.raw);

    if (run.o2InitialPct === null) { exclude(EXCLUSION.noO2); continue; }
    if (run.events.length > 1) { exclude(EXCLUSION.twoEvents); continue; }
    if (min === null || max === null) { exclude(EXCLUSION.notNumeric); continue; }
    if (run.flags.includes(MIN_UNCERTAIN_FLAG)) { exclude(EXCLUSION.minUncertain); continue; }

    const point = { ...base, o2Pct: run.o2InitialPct, o2FinalPct: run.o2FinalPct };
    if (event === "extinction") {
      const at = air.match(/(\d+(?:\.\d+)?)\s*ext/i);
      if (at && Number(at[1]) === min) points.push({ ...point, flowCmS: min, relation: "at" });
      else if (/\b(down|decr)\w*\s+to\s+ext/i.test(air)) points.push({ ...point, flowCmS: min, relation: "below" });
      else exclude(EXCLUSION.extinctionStep);
    } else if (event === "blowoff") {
      const at = air.match(/(\d+(?:\.\d+)?)\s*blowoff/i);
      if (at && Number(at[1]) === max) points.push({ ...point, flowCmS: max, relation: "at" });
      else exclude(EXCLUSION.blowoffStep);
    } else {
      points.push({ ...point, flowCmS: min, flowMaxCmS: max, relation: "across" });
    }
  }
  return { points, excluded };
}

/** Range of conditions the limits table tested for one material (all its runs). */
export type Envelope = {
  family: MaterialFamily;
  runs: number;
  o2: [number, number] | null;
  flow: [number, number] | null;
};

export function testedEnvelope(runs: Run[], family: MaterialFamily): Envelope {
  const mine = runs.filter((r) => r.investigationId === LIMITS_INVESTIGATION && r.material.family === family);
  const o2 = mine.flatMap((r) => (r.o2InitialPct === null ? [] : [r.o2InitialPct]));
  const flow = mine.flatMap((r) =>
    r.flowCmS.min === null || r.flowCmS.max === null ? [] : [r.flowCmS.min, r.flowCmS.max],
  );
  return {
    family,
    runs: mine.length,
    o2: o2.length ? [Math.min(...o2), Math.max(...o2)] : null,
    flow: flow.length ? [Math.min(...flow), Math.max(...flow)] : null,
  };
}

/** Starting-oxygen range over every run in the limits table. */
function allO2Range(runs: Run[]): [number, number] | null {
  const o2 = runs.flatMap((r) =>
    r.investigationId === LIMITS_INVESTIGATION && r.o2InitialPct !== null ? [r.o2InitialPct] : [],
  );
  return o2.length ? [Math.min(...o2), Math.max(...o2)] : null;
}

export const REFUSAL =
  "No recorded limit near this scenario. Firebreak does not extrapolate beyond tested conditions.";

const EVENT_WORD: Record<LimitEvent, string> = {
  extinction: "extinction",
  blowoff: "blowoff",
  "no-ignition": "no ignition",
};

/** "PSI-25 test B14: extinction at 2 cm/s, starting oxygen 15% (PMMA film)". */
export function describePoint(p: LimitPoint): string {
  const flow =
    p.relation === "across"
      ? `at ${p.flowCmS}–${p.flowMaxCmS} cm/s`
      : p.relation === "below"
        ? `below ${p.flowCmS} cm/s (flow lowered on fan settings after the last recorded step)`
        : `at ${p.flowCmS} cm/s`;
  const final = p.o2FinalPct === null ? "" : `, final ${p.o2FinalPct}%`;
  const flags = p.flags.length ? `. Flags: ${p.flags.join("; ")}` : "";
  return `${LIMITS_INVESTIGATION} test ${p.testId}: ${EVENT_WORD[p.event]} ${flow}, starting oxygen ${p.o2Pct}%${final} (${p.family})${flags}.`;
}

export type LimitsView =
  | { kind: "needs-material"; text: string }
  | { kind: "refusal"; text: typeof REFUSAL; reasons: string[] }
  | { kind: "limits"; envelope: Envelope; nearest: LimitPoint[]; position: string[] };

const range = ([a, b]: [number, number], unit: string) => `${a}–${b}${unit}`;

export function limitsForScenario(s: Scenario, runs: Run[], max = 3): LimitsView {
  const { points } = limitPoints(runs);
  const family = s.materialFamily;
  const reasons: string[] = [];

  if (s.gravity !== undefined && s.gravity !== "micro")
    reasons.push(
      `Every recorded limit is from microgravity on the ISS; your scenario is set to ${s.gravity === "1g" ? "Earth gravity" : `${s.gravity} gravity`}.`,
    );
  // Oxygen against the material's recorded starting oxygen, or every material's
  // when none is set. Checked whether or not other reasons already apply.
  const env = family === undefined ? null : testedEnvelope(runs, family);
  const o2Range = env ? env.o2 : allO2Range(runs);
  const whose = family ?? "any material";
  if (s.o2Pct !== undefined && o2Range) {
    if (s.o2Pct > o2Range[1])
      reasons.unshift(`Oxygen ${s.o2Pct}% is above every recorded starting oxygen for ${whose} (max ${o2Range[1]}%).`);
    else if (s.o2Pct < o2Range[0])
      reasons.unshift(`Oxygen ${s.o2Pct}% is below every recorded starting oxygen for ${whose} (min ${o2Range[0]}%).`);
  }
  const mine = family === undefined ? [] : points.filter((p) => p.family === family);
  if (env && !mine.length)
    reasons.push(`No ${LIMITS_INVESTIGATION} run of ${family} has a usable recorded limit (${env.runs} runs of it in the table).`);

  if (reasons.length) return { kind: "refusal", text: REFUSAL, reasons };
  if (!env)
    return {
      kind: "needs-material",
      text: "Pick a material to compare the scenario with that material's recorded limits.",
    };

  const dist = (p: LimitPoint) =>
    (s.o2Pct === undefined ? 0 : Math.abs(p.o2Pct - s.o2Pct)) +
    (s.flowCmS === undefined ? 0 : Math.abs(p.flowCmS - s.flowCmS) / 5);
  const nearest = [...mine].sort((a, b) => dist(a) - dist(b) || a.testId.localeCompare(b.testId)).slice(0, max);

  const inside = (v: number, [a, b]: [number, number]) => (v >= a && v <= b ? "inside" : "outside");
  const position: string[] = [];
  if (s.o2Pct !== undefined && env.o2)
    position.push(`Oxygen ${s.o2Pct}%: ${inside(s.o2Pct, env.o2)} the range tested for ${family} (${range(env.o2, "%")}).`);
  if (s.flowCmS !== undefined && env.flow)
    position.push(`Airflow ${s.flowCmS} cm/s: ${inside(s.flowCmS, env.flow)} the range tested for ${family} (${range(env.flow, " cm/s")}).`);
  position.push(
    s.gravity === "micro"
      ? "Gravity: microgravity, the only gravity these limits were recorded in."
      : "Gravity not set: every recorded limit is from microgravity on the ISS.",
  );
  return { kind: "limits", envelope: env, nearest, position };
}

/** Fixed panel wording, exported so tests can check it for banned words. */
export const LIMITS_PANEL_TEXT = {
  title: "Recorded flammability limits",
  intro:
    "Marked points are BASS-II (PSI-25) runs whose table row records an event keyword at a recorded airflow step. Grey points are BASS-II runs with no event keyword: outcome not recorded. Nothing is fitted or extrapolated.",
  legend: {
    extinctionAt: "Extinction at this flow",
    extinctionBelow: "Extinction below this flow",
    blowoff: "Blowoff at this flow",
    noIgnition: "No ignition at this flow",
    notRecorded: "Outcome not recorded",
    envelope: "Range tested for the selected material",
  },
  zeroFlow: "0 cm/s (no forced flow) is drawn at the left edge of the log axis.",
  nearestHeading: "Nearest recorded limits",
  positionHeading: "Your scenario and the tested range",
} as const;
