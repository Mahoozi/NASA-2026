// Person A — data dictionary for the CSV download. Columns come from
// CSV_COLUMNS in export.ts (the code that writes the file); flag types come
// from the flags present in the runs (flag-types.ts), so nothing is typed twice.
import { ChevronRightIcon } from "lucide-react";
import type { Run } from "@/lib/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CSV_COLUMNS, CSV_FILENAME, NULL_MEANING } from "./export";
import { flagTypes } from "./flag-types";

export function DataDictionary({ runs }: { runs: Run[] }) {
  const groups = flagTypes(runs);
  return (
    <div className="flex flex-col gap-4">
      <h3 id="dictionary-heading" className="text-base font-semibold">
        Data dictionary: {CSV_FILENAME}
      </h3>
      <p className="text-sm text-muted-foreground">
        One row per run, {CSV_COLUMNS.length} columns. An empty cell (null in the JSON) means:{" "}
        {NULL_MEANING.charAt(0).toLowerCase() + NULL_MEANING.slice(1)}
      </p>
      {/* Closed by default: the columns and flag types are reference material. */}
      <details className="group flex flex-col">
        <summary className="flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card/70 px-3 py-2 text-sm font-medium hover:border-primary/70 [&::-webkit-details-marker]:hidden">
          <ChevronRightIcon aria-hidden className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
          Columns and flag types
        </summary>
        <div className="flex flex-col gap-4 pt-4">
      <Table aria-labelledby="dictionary-heading">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Column</TableHead>
            <TableHead scope="col">Unit</TableHead>
            <TableHead scope="col">Meaning</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {CSV_COLUMNS.map((c) => (
            <TableRow key={c.name}>
              <TableCell className="font-mono text-sm">{c.name}</TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {c.unit || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-sm whitespace-normal">{c.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h4 className="text-sm font-semibold">Flag types</h4>
      <p className="text-sm text-muted-foreground">
        Flags are the importer&apos;s notes on a row. A flagged value is either kept exactly as
        recorded (for example an approximate oxygen) or left empty when it cannot be trusted; it
        is never corrected. Counts are runs with that flag.
      </p>
      <dl className="flex flex-col gap-3 text-sm">
        {groups.map((g) => (
          <div key={g.field} className="flex flex-col gap-1">
            <dt className="font-medium">
              {g.field}
              {g.columns && (
                <span className="font-normal text-muted-foreground"> ({g.columns})</span>
              )}
            </dt>
            <dd>
              <ul className="flex list-disc flex-col gap-0.5 pl-5">
                {g.types.map(([type, n]) => (
                  <li key={type}>
                    {type} <span className="text-muted-foreground tabular-nums">· {n}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
        </div>
      </details>
    </div>
  );
}
