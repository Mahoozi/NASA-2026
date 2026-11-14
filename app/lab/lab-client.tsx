"use client";
// Person A — owns the scenario state, which lives in the URL.
import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { matchInvestigations } from "@/lib/match";
import type { Investigation, Run, Scenario } from "@/lib/schema";
import { RankedList } from "./ranked-list";
import { hasScoredDimension, parseScenario, presets, scenarioToQuery } from "./scenario";
import { ScenarioForm } from "./scenario-form";

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
  const presetList = useMemo(() => presets(runs), [runs]);
  const matches = useMemo(
    () => matchInvestigations(scenario, investigations, runs),
    [scenario, investigations, runs],
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ScenarioForm scenario={scenario} presets={presetList} onChange={setScenario} />
      <section className="flex flex-col gap-3" aria-labelledby="ranked-heading">
        <h2 id="ranked-heading" className="text-lg font-semibold">
          Closest evidence
        </h2>
        {hasScoredDimension(scenario) ? (
          <RankedList matches={matches} pendingIds={pendingIds} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick a preset or set material, oxygen, airflow, gravity or safety area
            to rank the investigations. Pressure alone is not scored.
          </p>
        )}
      </section>
    </div>
  );
}
