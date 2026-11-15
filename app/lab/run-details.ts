// Person A — the words in the Lab's hover/focus details. Pure. Every value comes from
// the same formatters the runs table uses (materialLabel, flowText, outcomeText), so a
// tooltip can never say something the table does not.
import type { Investigation, Run } from "../../lib/schema";
import { materialLabel } from "./material-label";
import { flowText, outcomeText } from "./run-order";

export const NO_RUN_IN_CELL = "No recorded run in this cell.";
export const MAX_TEST_IDS = 5;

export const flagCountText = (n: number) => (n === 0 ? "no flags" : `${n} flag${n === 1 ? "" : "s"}`);

export const acronymOf = (investigationId: string, investigations: Investigation[]) =>
  investigations.find((i) => i.id === investigationId)?.acronym || investigationId;

export type TipLine = { label: string; value: string };

/** What a gap-chart point says: a title and one labelled value per line. */
export function runTip(run: Run, investigations: Investigation[]): { title: string; lines: TipLine[] } {
  return {
    title: `Test ${run.testId}`,
    lines: [
      { label: "Investigation", value: acronymOf(run.investigationId, investigations) },
      { label: "Material", value: materialLabel(run) },
      { label: "Starting O₂", value: run.o2InitialPct === null ? "not recorded" : `${run.o2InitialPct}%` },
      { label: "Airflow", value: `${flowText(run) ?? "not numeric"} cm/s` },
      { label: "Outcome", value: outcomeText(run) },
      { label: "Flags", value: flagCountText(run.flags.length) },
    ],
  };
}

/** The same content as one sentence-like string, for aria-label. */
export const runTipText = (t: ReturnType<typeof runTip>) =>
  `${t.title}. ${t.lines.map((l) => `${l.label}: ${l.value}`).join(". ")}.`;

/** What a coverage-grid cell says, from the run list the grid already holds for that cell. */
export function cellTip(runs: Run[], investigations: Investigation[]) {
  if (runs.length === 0) return { empty: true as const, text: NO_RUN_IN_CELL };
  const byInv = new Map<string, number>();
  for (const r of runs) byInv.set(r.investigationId, (byInv.get(r.investigationId) ?? 0) + 1);
  const shown = runs.slice(0, MAX_TEST_IDS).map((r) => r.testId);
  const more = runs.length - shown.length;
  return {
    empty: false as const,
    count: `${runs.length} run${runs.length === 1 ? "" : "s"}`,
    investigations: [...byInv].map(([id, n]) => `${acronymOf(id, investigations)} (${n})`).join(", "),
    testIds: shown.join(", ") + (more > 0 ? ` +${more} more` : ""),
  };
}

export const cellTipText = (t: ReturnType<typeof cellTip>) =>
  t.empty ? t.text : `${t.count}. From ${t.investigations}. Tests ${t.testIds}.`;
