// Person A — counts shared by the landing page and /brief, computed from data/.
import type { Investigation, Run } from "../../lib/schema";

/**
 * Runs carry no gravity field; a run counts as lunar or Martian only if its
 * investigation's platform says so in data/investigations.json.
 */
export function partialGravityRunCount(runs: Run[], investigations: Investigation[]): number {
  const platformOf = (id: string) => investigations.find((i) => i.id === id)?.platform ?? "";
  return runs.filter((r) => /moon|lunar|mars|martian/i.test(platformOf(r.investigationId))).length;
}

/** Runs whose table records a starting oxygen. Every imported run burned a solid material. */
export const runsWithStartingO2 = (runs: Run[]) => runs.filter((r) => r.o2InitialPct !== null);

export const maxStartingO2 = (runs: Run[]) => Math.max(...runsWithStartingO2(runs).map((r) => r.o2InitialPct!));
