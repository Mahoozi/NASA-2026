// Person A
import { Suspense } from "react";
import runsJson from "@/data/runs.json";
import type { Run } from "@/lib/schema";
import { DownloadDataset } from "./download-dataset";
import { LabClient } from "./lab-client";
import { loadInvestigations } from "./load-investigations";
import { RunsTable } from "./runs-table";

export default function LabPage() {
  const runs = runsJson as Run[];
  const flagged = runs.filter((r) => r.flags.length).length;
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

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">All BASS-II runs</h2>
          <p className="text-sm text-muted-foreground">
            PSI-25 (BASS-II): {runs.length} runs, {flagged} with data-quality flags.
            Values are as recorded in the source table; flagged values were not corrected.
          </p>
        </div>
        <RunsTable runs={runs} />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="download-heading">
        <h2 id="download-heading" className="text-lg font-semibold">
          Download
        </h2>
        <DownloadDataset runs={runs} />
      </section>
    </div>
  );
}
