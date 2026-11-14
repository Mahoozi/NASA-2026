// Person A — picks published findings (Person B's data/findings.json) whose
// tags overlap the Lab scenario. Pure functions, no I/O. The page verifies each
// quote against data/corpus.json on the server before anything reaches here.
import type { CorpusDoc, Finding, Scenario } from "@/lib/schema";

export const MAX_FINDINGS = 3;
export const FINDING_LABEL = "Published finding; quote verified against source";

export type FindingOverlap = "material" | "oxygen" | "airflow" | "gravity" | "partial gravity";

export type MatchedFinding = { finding: Finding; overlaps: FindingOverlap[] };

const within = (v: number, [lo, hi]: [number, number]) => v >= Math.min(lo, hi) && v <= Math.max(lo, hi);

/** Which scenario dimensions a finding's tags overlap. Empty when none do. */
export function findingOverlaps(scenario: Scenario, f: Finding): FindingOverlap[] {
  const t = f.tags;
  const out: FindingOverlap[] = [];
  if (scenario.materialFamily && t.materials?.includes(scenario.materialFamily)) out.push("material");
  if (scenario.o2Pct !== undefined && t.o2Range && within(scenario.o2Pct, t.o2Range)) out.push("oxygen");
  if (scenario.flowCmS !== undefined && t.flowRange && within(scenario.flowCmS, t.flowRange)) out.push("airflow");
  if (scenario.gravity && t.gravity?.includes(scenario.gravity)) out.push("gravity");
  if ((scenario.gravity === "lunar" || scenario.gravity === "martian") && t.topic === "partial-gravity")
    out.push("partial gravity");
  return out;
}

/**
 * Up to `limit` findings that overlap the scenario on at least one dimension,
 * most overlaps first, then newest, then id. Never reorders by anything the
 * finding claims.
 */
export function relevantFindings(
  scenario: Scenario,
  findings: Finding[],
  limit = MAX_FINDINGS,
): MatchedFinding[] {
  return findings
    .map((finding) => ({ finding, overlaps: findingOverlaps(scenario, finding) }))
    .filter((m) => m.overlaps.length > 0)
    .sort(
      (a, b) =>
        b.overlaps.length - a.overlaps.length ||
        b.finding.year - a.finding.year ||
        a.finding.id.localeCompare(b.finding.id),
    )
    .slice(0, limit);
}

/**
 * Findings whose quote is an exact substring of the text of their source
 * CorpusDoc. Anything else is dropped, so the panel's "quote verified" label is
 * only ever shown on a quote that was checked.
 */
export function verifiedFindings(findings: Finding[], corpus: CorpusDoc[]): Finding[] {
  const text = new Map(corpus.map((d) => [d.id, d.text]));
  return findings.filter((f) => f.quote.length > 0 && (text.get(f.sourceDocId)?.includes(f.quote) ?? false));
}
