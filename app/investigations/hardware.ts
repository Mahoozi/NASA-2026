// Person A (requested for the investigations page) — hardware groups from the
// challenge brief. Pure: no data imports, so tests and /brief can use it.
import type { Investigation } from "../../lib/schema";

export type HardwareGroup = {
  id: "acme" | "mdca" | "msg";
  name: string;
  /** The brief's sentence for this group, exact; a substring of BRIEF_TEXT. */
  briefQuote: string;
  /** PSI ids the brief names for the group. */
  ids: string[];
};

/**
 * Groups come from the "Hardware" section of the NASA Space Apps 2026 challenge
 * brief (https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/,
 * fetched 2026-11-14), not from the stored facility strings, which are
 * inconsistent. Mapping of the brief's names to PSI ids:
 * - ACME's six experiments: ACME/Flame Design PSI-10, BRE PSI-20, CLD Flame
 *   PSI-21, E-FIELD Flames PSI-22, s-Flame PSI-23, CFI-G PSI-159.
 * - "FLEX, FLEX-2, and the Cool Flames Investigation (CFI)": PSI-69, PSI-68, PSI-39.
 * - "BASS, BASS-II, SPICE, and SLICE": PSI-26, PSI-25, PSI-107, PSI-106.
 */
export const HARDWARE_GROUPS: HardwareGroup[] = [
  {
    id: "acme",
    name: "ACME in the Combustion Integrated Rack (CIR)",
    briefQuote:
      "The six experiments in the ACME project featured flames of gaseous fuels and were all conducted with the same modular set of ACME hardware in the Combustion Integrated Rack (CIR).",
    ids: ["PSI-10", "PSI-20", "PSI-21", "PSI-22", "PSI-23", "PSI-159"],
  },
  {
    id: "mdca",
    name: "Multi-user Droplet Combustion Apparatus (MDCA) in the CIR",
    briefQuote:
      "FLEX, FLEX-2, and the Cool Flames Investigation (CFI) each featured burning droplets of liquid fuel and were conducted with the Multi-user Droplet Combustion Apparatus (MDCA) in the CIR.",
    ids: ["PSI-39", "PSI-68", "PSI-69"],
  },
  {
    id: "msg",
    name: "Microgravity Science Glovebox (MSG) with the SPICE flow duct",
    briefQuote:
      "BASS, BASS-II, the Smoke Point In Co-flow Experiment (SPICE), and the Structure & Liftoff In Combustion Experiment (SLICE) collectively featured both solid and gaseous fuels. Each of these investigations was conducted within the Microgravity Science Glovebox (MSG) using the modular fan-driven flow duct built for SPICE.",
    ids: ["PSI-25", "PSI-26", "PSI-106", "PSI-107"],
  },
];

export type GroupedInvestigations = {
  groups: { group: HardwareGroup; members: Investigation[] }[];
  /** Every investigation the brief's hardware groups do not name, in stored order. */
  rest: Investigation[];
};

export function groupInvestigations(
  investigations: Investigation[],
  groups: HardwareGroup[] = HARDWARE_GROUPS,
): GroupedInvestigations {
  const byId = new Map(investigations.map((i) => [i.id, i]));
  const grouped = new Set(groups.flatMap((g) => g.ids));
  return {
    groups: groups.map((group) => ({
      group,
      members: group.ids.flatMap((id) => byId.get(id) ?? []),
    })),
    rest: investigations.filter((i) => !grouped.has(i.id)),
  };
}
