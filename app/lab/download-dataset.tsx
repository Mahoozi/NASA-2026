"use client";
// Person A — client-side download of the cleaned dataset. No server call.
import { DownloadIcon } from "lucide-react";
import type { Run } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { runsToCsv, runsToJson } from "./export";

function save(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function DownloadDataset({ runs }: { runs: Run[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        onClick={() => save(runsToCsv(runs), "firebreak-psi-runs.csv", "text/csv;charset=utf-8")}
      >
        <DownloadIcon data-icon="inline-start" />
        Download cleaned dataset (CSV)
      </Button>
      <Button
        variant="outline"
        onClick={() => save(runsToJson(runs), "firebreak-psi-runs.json", "application/json")}
      >
        <DownloadIcon data-icon="inline-start" />
        Download cleaned dataset (JSON)
      </Button>
      <p className="text-sm text-muted-foreground">
        All {runs.length} runs, every field, with data-quality flags.
      </p>
    </div>
  );
}
