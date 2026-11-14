// Person A — the material name the UI shows for a run.
import type { Run } from "@/lib/schema";

/**
 * The family, except for "other", where a short label is derived from the
 * source text so different unclassified materials don't collapse into one.
 */
export function materialLabel(run: Pick<Run, "material">): string {
  const { family, raw } = run.material;
  if (family !== "other") return family;
  const lc = raw.toLowerCase();
  if (lc.includes("silicone")) return "Silicone";
  if (lc.includes("ultem")) return "Ultem sheet";
  if (lc.includes("pmma") && lc.includes("nomex")) return "PMMA & Nomex";
  if (lc.includes("pmma")) return "PMMA (shape not stated)";
  if (lc.includes("spherical")) return "Spherical section";
  return raw;
}
