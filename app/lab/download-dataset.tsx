"use client";
// Person A — client-side download of the cleaned dataset. No server call.
import { DownloadIcon } from "lucide-react";
import type { Run } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { DataDictionary } from "./data-dictionary";
import { CSV_FILENAME, JSON_FILENAME, runsToCsv, runsToJson } from "./export";

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() =>
            save(runsToCsv(runs), CSV_FILENAME, "text/csv;charset=utf-8")
          }
        >
          <DownloadIcon data-icon="inline-start" />
          Download cleaned dataset (CSV)
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            save(runsToJson(runs), JSON_FILENAME, "application/json")
          }
        >
          <DownloadIcon data-icon="inline-start" />
          Download cleaned dataset (JSON)
        </Button>
        <p className="text-sm text-muted-foreground">
          All {runs.length} runs, every field, with data-quality flags.
        </p>
      </div>
      <DataDictionary runs={runs} />
    </div>
  );
}
