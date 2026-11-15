// Person B — wording shared by the scorecard totals and the per-question table.
import type { EvalItem } from "@/pipeline/evals-result";

export const STATUS_LABEL: Record<EvalItem["gotStatus"], string> = {
  answered: "Answered",
  insufficient_evidence: "No answer in sources",
  error: "Error",
};

/** "9 of 12 (75%)"; the percentage is left out when the denominator is 0. */
export function fraction(n: number, d: number): string {
  return d > 0 ? `${n} of ${d} (${Math.round((n / d) * 100)}%)` : `${n} of ${d}`;
}
