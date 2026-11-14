"use client";
// Person A — owns the scenario state, which lives in the URL.
// Page order: presets and form → summary + gaps → coverage grid → gap chart
// → ranked investigations → runs table → download.
import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { matchInvestigations, RUN_DIMENSIONS } from "@/lib/match";
import type { Investigation, Run, Scenario } from "@/lib/schema";
import { CoverageGrid } from "./coverage-grid";
import { GapChart } from "./gap-chart";
import { evidenceGaps } from "./gaps";
import { GapsPanel } from "./gaps-panel";
import { RankedList } from "./ranked-list";
import { hasScoredDimension, parseScenario, presets, scenarioToQuery } from "./scenario";
import { ScenarioForm } from "./scenario-form";
import { Summary } from "./summary";

export function LabClient({
  runs,
  investigations,
  pendingIds,
}: {
  runs: Run[];
  investigations: Investigation[];
  pendingIds: string[];
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const scenario = useMemo(() => parseScenario(params), [params]);
  const scored = hasScoredDimension(scenario);
  const presetList = useMemo(() => presets(runs), [runs]);
  const matches = useMemo(
    () => matchInvestigations(scenario, investigations, runs),
    [scenario, investigations, runs],
  );
  const gaps = useMemo(
    () => evidenceGaps(scenario, runs, investigations),
    [scenario, runs, investigations],
  );
  // Runs that match every run-level dimension set; null when none is set.
  const matchingRunIds = useMemo(
    () =>
      RUN_DIMENSIONS.some((d) => scenario[d] !== undefined)
        ? new Set(matches.flatMap((m) => m.matchingRunIds))
        : null,
    [scenario, matches],
  );

  // Native History API: Next keeps useSearchParams in sync, no server round trip.
  const setScenario = useCallback(
    (next: Scenario) => {
      const q = scenarioToQuery(next);
      window.history.replaceState(null, "", q ? `${pathname}?${q}` : pathname);
    },
    [pathname],
  );

  return (
    <div className="flex flex-col gap-10">
      <ScenarioForm scenario={scenario} presets={presetList} onChange={setScenario} />

      <section aria-labelledby="summary-heading" className="flex flex-col gap-4">
        <h2 id="summary-heading" className="text-lg font-semibold">
          Summary
        </h2>
        {scored ? (
          <>
            <Summary matches={matches} />
            <GapsPanel report={gaps} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick a preset or set material, oxygen, airflow, gravity or safety area.
            Pressure alone is not scored.
          </p>
        )}
      </section>

      <section aria-labelledby="grid-heading" className="flex flex-col gap-3">
        <h2 id="grid-heading" className="text-lg font-semibold">
          Coverage grid: runs by material and starting oxygen
        </h2>
        <CoverageGrid
          runs={runs}
          scenario={scenario}
          onPick={(materialFamily, o2Pct) => setScenario({ ...scenario, materialFamily, o2Pct })}
        />
      </section>

      <section aria-labelledby="chart-heading" className="flex flex-col gap-3">
        <h2 id="chart-heading" className="text-lg font-semibold">
          Gap chart: airflow and starting oxygen of every run
        </h2>
        <GapChart runs={runs} scenario={scenario} matchingRunIds={matchingRunIds} />
      </section>

      {scored && (
        <section className="flex flex-col gap-3" aria-labelledby="ranked-heading">
          <h2 id="ranked-heading" className="text-lg font-semibold">
            Ranked investigations
          </h2>
          <RankedList matches={matches} pendingIds={pendingIds} />
        </section>
      )}
    </div>
  );
}
