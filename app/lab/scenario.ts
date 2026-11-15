// Person A — scenario <-> URL, presets. Pure; safe on server and client.
import type { MaterialFamily, Run, SafetyArea, Scenario } from "@/lib/schema";
import { BRIEF_URL, SPACESUIT_QUOTE } from "../brief/brief-text";

export const MATERIAL_FAMILIES: MaterialFamily[] = [
  "PMMA film", "PMMA slab", "PMMA rod", "PMMA sphere",
  "SIBAL fabric", "Nomex", "wax", "other",
];
export const GRAVITIES = ["micro", "lunar", "martian", "1g"] as const;
export const GRAVITY_LABEL: Record<(typeof GRAVITIES)[number], string> = {
  micro: "Microgravity",
  lunar: "Lunar gravity",
  martian: "Martian gravity",
  "1g": "Earth gravity (1 g)",
};
/** Shown under the pressure field and in the printable report. */
export const PRESSURE_CONTEXT_NOTE = "Pressure is context only; none of the imported PSI tables records it.";

export const SAFETY_AREAS: SafetyArea[] = ["prevention", "detection", "suppression", "fundamental"];

/** URL keys, in the order they are written. */
const KEYS = {
  materialFamily: "material",
  o2Pct: "o2",
  flowCmS: "flow",
  pressurePsi: "pressure",
  gravity: "gravity",
  safetyArea: "area",
} as const;

type Getter = { get(key: string): string | null };

const num = (raw: string | null, ok: (n: number) => boolean) => {
  if (raw === null || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && ok(n) ? n : undefined;
};
const oneOf = <T extends string>(raw: string | null, allowed: readonly T[]) =>
  allowed.includes(raw as T) ? (raw as T) : undefined;

/** Read a scenario from URL search params. Unknown or invalid values are ignored. */
export function parseScenario(params: Getter): Scenario {
  const s: Scenario = {
    materialFamily: oneOf(params.get(KEYS.materialFamily), MATERIAL_FAMILIES),
    o2Pct: num(params.get(KEYS.o2Pct), (n) => n >= 0 && n <= 100),
    flowCmS: num(params.get(KEYS.flowCmS), (n) => n >= 0),
    pressurePsi: num(params.get(KEYS.pressurePsi), (n) => n > 0),
    gravity: oneOf(params.get(KEYS.gravity), GRAVITIES),
    safetyArea: oneOf(params.get(KEYS.safetyArea), SAFETY_AREAS),
  };
  for (const k of Object.keys(s) as (keyof Scenario)[]) if (s[k] === undefined) delete s[k];
  return s;
}

export function scenarioToQuery(s: Scenario): string {
  const p = new URLSearchParams();
  for (const [field, key] of Object.entries(KEYS) as [keyof typeof KEYS, string][]) {
    const v = s[field];
    if (v !== undefined) p.set(key, String(v));
  }
  return p.toString();
}

/**
 * The pitch's demo scenario, and what the Lab opens on when the link carries none.
 * The claim checks on /evals recompute its matching runs from the data.
 */
export const DEMO_SCENARIO: Scenario = { materialFamily: "PMMA rod", o2Pct: 17, flowCmS: 5, gravity: "micro" };

/** True when the URL sets any scenario field (the Lab's own keys only). */
export const hasScenarioParams = (params: Getter) =>
  Object.values(KEYS).some((k) => params.get(k) !== null);

/** True when the scenario sets something matching can score (pressure is context only). */
export function hasScoredDimension(s: Scenario): boolean {
  return (["materialFamily", "o2Pct", "flowCmS", "gravity", "safetyArea"] as const)
    .some((k) => s[k] !== undefined);
}

/** The ISS preset is sourced from BASS-II, the investigation run in ISS cabin air. */
export const ISS_SOURCE_INVESTIGATION = "PSI-25";

/** Starting-O2 range of the PSI-25 runs done in (near-)ISS cabin air, from the data. */
export function issAirO2Range(runs: Run[], threshold = 20.5) {
  const o2 = runs
    .filter((r) => r.investigationId === ISS_SOURCE_INVESTIGATION)
    .map((r) => r.o2InitialPct)
    .filter((v): v is number => v !== null && v >= threshold);
  return o2.length ? { min: Math.min(...o2), max: Math.max(...o2), n: o2.length } : null;
}

/**
 * Challenge brief: "the Moon Base and pressurized rover(s) will be at a pressure and
 * oxygen concentration between those in a spacesuit and the Earth's atmosphere. The
 * intermediate oxygen concentration used on the Moon will likely be 30% or greater,
 * with a corresponding pressure of 10.2 psi or less."
 */
const MOON_ATMOSPHERE_SOURCE =
  "NASA Space Apps challenge brief: likely 30% oxygen or more at 10.2 psi or less.";

/**
 * Garbino et al., "Open Atmospheres Forum: Exploration Atmospheres Validation Study",
 * NASA Johnson Space Center presentation, 5 Aug 2022 (NTRS 20220011152), p. 10:
 * "Equilibrate to Exploration Atmosphere: 8.2psi/34% O2 for 48 hrs". The source
 * gives no gravity for the atmosphere itself, so the preset leaves gravity unset.
 */
export const EXPLORATION_ATMOSPHERE = {
  ntrs: "20220011152",
  url: "https://ntrs.nasa.gov/api/citations/20220011152/downloads/Exploration%20Atmosphers%20OAF%2020220805.pdf",
  quote: "Exploration Atmosphere: 8.2psi/34% O2",
} as const;

export type Preset = {
  id: string;
  label: string;
  scenario: Scenario;
  source: string;
  /** Link for the source line, when it is a document. */
  sourceUrl?: string;
};

export function presets(runs: Run[]): Preset[] {
  const iss = issAirO2Range(runs);
  return [
    {
      id: "iss",
      label: "ISS cabin air",
      scenario: { o2Pct: 21, gravity: "micro" },
      source: iss
        ? `BASS-II runs started at ${iss.min}–${iss.max}% O2 in ISS air (computed from PSI-25 runs only)`
        : "No BASS-II (PSI-25) run started at 20.5% O2 or more",
    },
    {
      id: "moon",
      label: "Moon Base (planned)",
      scenario: { o2Pct: 30, pressurePsi: 10.2, gravity: "lunar" },
      source: MOON_ATMOSPHERE_SOURCE,
    },
    // The brief expects the Moon Base and pressurized rover(s) to share the same
    // intermediate atmosphere, so this preset uses the Moon Base values.
    {
      id: "rover",
      label: "Pressurized rover (planned)",
      scenario: { o2Pct: 30, pressurePsi: 10.2, gravity: "lunar" },
      source: MOON_ATMOSPHERE_SOURCE,
    },
    {
      id: "exploration",
      label: "NASA Exploration Atmosphere",
      scenario: { o2Pct: 34, pressurePsi: 8.2 },
      source: `NASA JSC, Open Atmospheres Forum 2022 (NTRS ${EXPLORATION_ATMOSPHERE.ntrs}): “${EXPLORATION_ATMOSPHERE.quote}”. Gravity not stated, so left unset.`,
      sourceUrl: EXPLORATION_ATMOSPHERE.url,
    },
    {
      id: "spacesuit",
      label: "Spacesuit (EVA)",
      scenario: { o2Pct: 100, pressurePsi: 4.3 },
      source: `NASA Space Apps challenge brief: “${SPACESUIT_QUOTE}”. Gravity not stated, so left unset.`,
      sourceUrl: BRIEF_URL,
    },
  ];
}
