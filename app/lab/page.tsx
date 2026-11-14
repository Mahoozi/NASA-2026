// Person A
import { Suspense } from "react";
import runsJson from "@/data/runs.json";
import type { Run } from "@/lib/schema";
import { LabClient } from "./lab-client";
import { loadInvestigations } from "./load-investigations";

export default function LabPage() {
  const runs = runsJson as Run[];
  const { investigations, pendingIds } = loadInvestigations(runs);
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Scenario Lab</h1>
        <p className="text-sm text-muted-foreground">
          Describe a fire scenario and see which NASA microgravity combustion
          investigations have evidence close to it.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading scenario…</p>}>
        <LabClient runs={runs} investigations={investigations} pendingIds={pendingIds} />
      </Suspense>
    </div>
  );
}
