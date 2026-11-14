"use client";
// Person A — owns the scenario state, which lives in the URL.
import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Run, Scenario } from "@/lib/schema";
import { parseScenario, presets, scenarioToQuery } from "./scenario";
import { ScenarioForm } from "./scenario-form";

export function LabClient({ runs }: { runs: Run[] }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const scenario = useMemo(() => parseScenario(params), [params]);
  const presetList = useMemo(() => presets(runs), [runs]);

  // Native History API: Next keeps useSearchParams in sync, no server round trip.
  const setScenario = useCallback(
    (next: Scenario) => {
      const q = scenarioToQuery(next);
      window.history.replaceState(null, "", q ? `${pathname}?${q}` : pathname);
    },
    [pathname],
  );

  return <ScenarioForm scenario={scenario} presets={presetList} onChange={setScenario} />;
}
