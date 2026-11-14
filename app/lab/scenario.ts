// Person A — scenario <-> URL, presets. Pure; safe on server and client.
import type { MaterialFamily, Run, SafetyArea, Scenario } from "@/lib/schema";

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

export type Preset = { id: string; label: string; scenario: Scenario; source: string };

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
  ];
}
