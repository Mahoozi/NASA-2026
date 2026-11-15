// Person A — registry of Firebreak's public claims. Each claim carries the number or
// outcome we state publicly (`expected`, declared here) and a function that recomputes
// it from the shipped data with the code the site itself uses. /evals shows the table;
// claims.test.ts fails the build when any row stops matching.
import corpusJson from "../../data/corpus.json";
import evalsJson from "../../data/evals.latest.json";
import findingsJson from "../../data/findings.json";
import investigationsJson from "../../data/investigations.json";
import watchlistJson from "../../data/hardware_watchlist.json";
import runsJson from "../../data/runs.json";
import { limitsForScenario } from "../../lib/limits";
import { matchInvestigations } from "../../lib/match";
import type { CorpusDoc, Finding, Investigation, Run } from "../../lib/schema";
import { SOURCE_DISCREPANCIES } from "../../pipeline/source_discrepancies";
import { buildAtlas } from "../atlas/atlas";
import { maxStartingO2, partialGravityRunCount, runsWithStartingO2 } from "../brief/run-facts";
import { quoteIsVerbatim, verifiedFindings } from "../lab/findings";
import { loadInvestigations } from "../lab/load-investigations";
import { matchingRunIdSet } from "../lab/matching-runs";
import { DEMO_SCENARIO, presets } from "../lab/scenario";
import type { WatchlistEntry } from "../watchlist/types";

/** The numbers and outcomes Firebreak states publicly. Change one only on purpose. */
export const PUBLIC = {
  runs: 263,
  runsWithO2: 140,
  maxO2: 22.2,
  partialGravityRuns: 0,
  demoRuns: 46,
  demoInvestigation: "PSI-25",
  discrepancies: 6,
  findings: 9,
  watchlistQuotes: 15,
  atlasCovered: 6,
  atlasTotal: 35,
} as const;

// The demo scenario lives with the Lab, which also opens on it; the claim checks it from here.
export { DEMO_SCENARIO };

export type Claim = {
  id: string;
  /** The wording used on the site. */
  claim: string;
  /** The declared outcome, as displayed. */
  expected: string;
  /** Recomputes the outcome from data, in the same format as `expected`. */
  compute: () => string;
};

export type ClaimResult = { id: string; claim: string; expected: string; actual: string; matches: boolean };

const runs = runsJson as Run[];
const investigations = investigationsJson as Investigation[];
const corpus = corpusJson as CorpusDoc[];
const findings = findingsJson as Finding[];
const watchlist = watchlistJson as WatchlistEntry[];

function demoOutcome(): string {
  const matches = matchInvestigations(DEMO_SCENARIO, loadInvestigations(runs).investigations, runs);
  const n = matchingRunIdSet(DEMO_SCENARIO, matches)?.size ?? 0;
  const top = matches.find((m) => m.investigation.id === PUBLIC.demoInvestigation);
  return `${n} matching runs; ${top?.investigation.id ?? "no investigation"} ${top?.coverage ?? "not found"}`;
}

function moonOutcome(): string {
  const moon = presets(runs).find((p) => p.id === "moon");
  if (!moon) return "Moon Base preset not found";
  const view = limitsForScenario(moon.scenario, runs);
  if (view.kind !== "refusal") return `limits panel shows "${view.kind}"`;
  const oxygen = view.reasons.some((r) => /^Oxygen /.test(r));
  const gravity = view.reasons.some((r) => /gravity/.test(r));
  return `refuses; oxygen reason ${oxygen ? "shown" : "missing"}; gravity reason ${gravity ? "shown" : "missing"}`;
}

/**
 * Each discrepancy flag sits on exactly the runs its entry names. The stricter check
 * that every run value equals a fresh import from data/raw needs the importers, which
 * the Next build cannot bundle; claims.test.ts runs it (see PSI_VALUES_UNCHANGED).
 */
function discrepancyOutcome(): string {
  const flagsExact = SOURCE_DISCREPANCIES.every((d) => {
    const want = runs
      .filter((r) => r.investigationId === d.psiId && (d.samples === "all" || d.samples.includes(r.testId)))
      .map((r) => r.id);
    const got = runs.filter((r) => r.flags.includes(d.flag)).map((r) => r.id);
    return want.length > 0 && want.join() === got.join();
  });
  return `${SOURCE_DISCREPANCIES.length} flagged; flags on the named runs: ${flagsExact ? "yes" : "no"}`;
}

function findingsOutcome(): string {
  return `${verifiedFindings(findings, corpus).length} of ${findings.length} verbatim`;
}

function watchlistOutcome(): string {
  const bad = watchlist.filter((e) => !quoteIsVerbatim(e.quote, e.sourceDocId, corpus));
  const hardware = watchlist.filter((e) => e.kind === "hardware").length;
  return bad.length ? `${bad.length} of ${watchlist.length} quotes not verbatim` : `${hardware} hardware quotes, all verbatim`;
}

function atlasOutcome(): string {
  const a = buildAtlas(runs, investigations);
  return `${a.covered} of ${a.total}`;
}

function citationsOutcome(): string {
  const { citations, citationsVerified } = evalsJson.totals;
  return citations > 0 && citations === citationsVerified ? "all verified" : `${citationsVerified} of ${citations}`;
}

export const CLAIMS: Claim[] = [
  {
    id: "runs",
    claim: `${PUBLIC.runs} imported flight runs`,
    expected: String(PUBLIC.runs),
    compute: () => String(runs.length),
  },
  {
    id: "runs-with-o2",
    claim: `${PUBLIC.runsWithO2} solid-material runs with a recorded starting oxygen`,
    expected: String(PUBLIC.runsWithO2),
    compute: () => String(runsWithStartingO2(runs).length),
  },
  {
    id: "max-o2",
    claim: `Highest recorded starting oxygen: ${PUBLIC.maxO2}%`,
    expected: `${PUBLIC.maxO2}%`,
    compute: () => `${maxStartingO2(runs)}%`,
  },
  {
    id: "partial-gravity",
    claim: `${PUBLIC.partialGravityRuns} runs in lunar or Martian gravity`,
    expected: String(PUBLIC.partialGravityRuns),
    compute: () => String(partialGravityRunCount(runs, investigations)),
  },
  {
    id: "demo",
    claim: `Demo scenario (PMMA rod, 17% O2, 5 cm/s, microgravity) matches ${PUBLIC.demoRuns} runs; BASS-II is a direct match`,
    expected: `${PUBLIC.demoRuns} matching runs; ${PUBLIC.demoInvestigation} direct`,
    compute: demoOutcome,
  },
  {
    id: "moon-base-limits",
    claim: "Moon Base preset: the limits panel refuses, with both the oxygen and the gravity reason",
    expected: "refuses; oxygen reason shown; gravity reason shown",
    compute: moonOutcome,
  },
  {
    id: "discrepancies",
    claim: `${PUBLIC.discrepancies} source discrepancies flagged on the runs they name`,
    expected: `${PUBLIC.discrepancies} flagged; flags on the named runs: yes`,
    compute: discrepancyOutcome,
  },
  {
    id: "findings",
    claim: `${PUBLIC.findings} published findings, every quote verbatim in its source`,
    expected: `${PUBLIC.findings} of ${PUBLIC.findings} verbatim`,
    compute: findingsOutcome,
  },
  {
    id: "watchlist",
    claim: `${PUBLIC.watchlistQuotes} watchlist quotes verbatim in the NESC report`,
    expected: `${PUBLIC.watchlistQuotes} hardware quotes, all verbatim`,
    compute: watchlistOutcome,
  },
  {
    id: "atlas",
    claim: `${PUBLIC.atlasCovered} of ${PUBLIC.atlasTotal} atmosphere–material combinations have a matching flight test`,
    expected: `${PUBLIC.atlasCovered} of ${PUBLIC.atlasTotal}`,
    compute: atlasOutcome,
  },
  {
    id: "citations",
    claim: "Citations verified in the latest eval run",
    expected: "all verified",
    compute: citationsOutcome,
  },
];

export function runClaims(claims: Claim[] = CLAIMS): ClaimResult[] {
  return claims.map((c) => {
    const actual = c.compute();
    return { id: c.id, claim: c.claim, expected: c.expected, actual, matches: actual === c.expected };
  });
}

/** One readable line per mismatch, for test output. */
export const mismatchMessages = (results: ClaimResult[]) =>
  results.filter((r) => !r.matches).map((r) => `Claim "${r.claim}": expected ${r.expected}, got ${r.actual}`);
