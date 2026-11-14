// Person A
import runs from "@/data/runs.json";
import type { Run } from "@/lib/schema";
import { RunsTable } from "./runs-table";

export default function LabPage() {
  const data = runs as Run[];
  const flagged = data.filter((r) => r.flags.length).length;
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Scenario Lab</h1>
        <p className="text-sm text-muted-foreground">
          PSI-25 (BASS-II): {data.length} runs, {flagged} with data-quality flags.
          Values are as recorded in the source table; flagged values were not corrected.
        </p>
      </div>
      <RunsTable runs={data} />
    </div>
  );
}
