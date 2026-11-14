// Person B — display helpers for /investigations (client-safe, no data imports).
import type { Investigation, SafetyArea } from "@/lib/schema";

export const SAFETY_AREAS: { value: SafetyArea; label: string }[] = [
  { value: "prevention", label: "Prevention" },
  { value: "detection", label: "Detection" },
  { value: "suppression", label: "Suppression" },
  { value: "fundamental", label: "Fundamental" },
];

export const safetyLabel = (s: SafetyArea) =>
  SAFETY_AREAS.find((a) => a.value === s)?.label ?? s;

/** Acronym, or the PSI id for the ground studies that have none. */
export const shortName = (inv: Investigation) => inv.acronym || inv.id;

export const fuelPhaseText = (inv: Investigation) =>
  inv.fuelPhase.length ? inv.fuelPhase.join(", ") : "not stated";

export const labHref = (id: string) => `/lab?investigation=${encodeURIComponent(id)}`;
