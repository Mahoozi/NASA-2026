// Person B — read the Lab handoff (?scenario=<json>&investigations=PSI-25,…)
// into an AskRequest context. Pure; safe on server and client.
import type { AskRequest, AskResponse, Scenario } from "../../lib/schema";
import { GRAVITIES, GRAVITY_LABEL, MATERIAL_FAMILIES, SAFETY_AREAS } from "../lab/scenario";

type Getter = { get(key: string): string | null };
type Context = NonNullable<AskRequest["context"]>;

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]) =>
  allowed.includes(v as T) ? (v as T) : undefined;

/**
 * Keep only the Scenario fields with valid values, so a hand-edited URL never
 * turns into a 400 from /api/ask. Returns undefined when nothing usable is left.
 */
export function sanitizeScenario(raw: unknown): Scenario | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const s: Scenario = {
    label: typeof r.label === "string" && r.label.trim() ? r.label.trim() : undefined,
    materialFamily: oneOf(r.materialFamily, MATERIAL_FAMILIES),
    o2Pct: isNum(r.o2Pct) && r.o2Pct >= 0 && r.o2Pct <= 100 ? r.o2Pct : undefined,
    pressurePsi: isNum(r.pressurePsi) && r.pressurePsi > 0 ? r.pressurePsi : undefined,
    flowCmS: isNum(r.flowCmS) && r.flowCmS >= 0 ? r.flowCmS : undefined,
    gravity: oneOf(r.gravity, GRAVITIES),
    safetyArea: oneOf(r.safetyArea, SAFETY_AREAS),
  };
  for (const k of Object.keys(s) as (keyof Scenario)[]) if (s[k] === undefined) delete s[k];
  return Object.keys(s).length ? s : undefined;
}

/** Comma-separated PSI ids, trimmed, upper-cased, de-duplicated. Anything else is dropped. */
export function parseInvestigationIds(raw: string | null): string[] {
  if (!raw) return [];
  const ids = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^PSI-\d+$/.test(s));
  return [...new Set(ids)];
}

/** The AskRequest context from URL params; undefined when the URL carries none. */
export function parseAskContext(params: Getter): Context | undefined {
  let scenario: Scenario | undefined;
  const rawScenario = params.get("scenario");
  if (rawScenario) {
    try {
      scenario = sanitizeScenario(JSON.parse(rawScenario));
    } catch {
      scenario = undefined; // not JSON: ignore it
    }
  }
  const investigationIds = parseInvestigationIds(params.get("investigations"));
  const ctx: Context = {};
  if (scenario) ctx.scenario = scenario;
  if (investigationIds.length) ctx.investigationIds = investigationIds;
  return Object.keys(ctx).length ? ctx : undefined;
}

/** One line describing the scenario, e.g. "PMMA rod, 17% O2, 5 cm/s flow, microgravity". */
export function scenarioSummary(s: Scenario): string {
  const parts = [
    s.materialFamily,
    s.o2Pct !== undefined ? `${s.o2Pct}% O2` : undefined,
    s.flowCmS !== undefined ? `${s.flowCmS} cm/s flow` : undefined,
    s.pressurePsi !== undefined ? `${s.pressurePsi} psi` : undefined,
    s.gravity ? GRAVITY_LABEL[s.gravity].toLowerCase() : undefined,
    s.safetyArea ? `${s.safetyArea} focus` : undefined,
  ].filter(Boolean);
  const body = parts.join(", ");
  if (s.label) return body ? `${s.label}: ${body}` : s.label;
  return body;
}

/**
 * Only verified citations are ever shown. Sentences left without one are
 * dropped; if none remain, the answer counts as insufficient evidence.
 */
export function shownAnswer(res: AskResponse): AskResponse["answer"] {
  if (res.status !== "answered") return [];
  return res.answer
    .map((a) => ({ ...a, citations: a.citations.filter((c) => c.verified) }))
    .filter((a) => a.sentence.trim() && a.citations.length > 0);
}
