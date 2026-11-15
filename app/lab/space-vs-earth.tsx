// Person A — Saffire-II's microgravity and 1-g burn lengths, side by side,
// exactly as the PSI-99 table writes them. No interpretation.
import type { MaterialFamily, Run } from "@/lib/schema";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GravityBoundsNote } from "./gravity-bounds-note";

export const SAFFIRE_II = "PSI-99";
const MATERIAL_FROM_ROW_ABOVE = "material blank in source; taken from the row above";

const observed = (r: Run, label: string) =>
  r.observations?.find((o) => o.label === label)?.value;

export function SpaceVsEarth({ runs, materialFamily }: { runs: Run[]; materialFamily?: MaterialFamily }) {
  const rows = runs.filter((r) => r.investigationId === SAFFIRE_II);
  // Rows recorded under the scenario's material family. "other" groups unlike materials
  // (silicone, PMMA & Nomex), so it is never treated as a match.
  const yours = (r: Run) => materialFamily !== undefined && materialFamily !== "other" && r.material.family === materialFamily;
  const highlighted = rows.filter(yours).length;
  if (!rows.length) return null;
  const cell = (v: string | undefined) =>
    v === undefined ? <span className="text-muted-foreground">not in table</span> : v;

  return (
    <div className="flex flex-col gap-3">
      <GravityBoundsNote className="max-w-3xl text-sm" />
      {highlighted > 0 && (
        <p className="text-sm text-muted-foreground">
          The {highlighted} row{highlighted === 1 ? "" : "s"} recorded as {materialFamily} (your material) {highlighted === 1 ? "is" : "are"} highlighted.
        </p>
      )}
      <Table>
        <TableCaption className="text-left">
          Values copied verbatim from the PSI-99 experimental table.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Sample</TableHead>
            <TableHead scope="col">Material</TableHead>
            <TableHead scope="col">Microgravity burn length</TableHead>
            <TableHead scope="col">1-g burn length</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} data-yours={yours(r) || undefined} className={yours(r) ? "bg-primary/10 shadow-[inset_3px_0_0_var(--primary)]" : undefined}>
              <TableCell className="font-medium">{r.testId}</TableCell>
              <TableCell className="whitespace-normal">
                {r.flags.includes(MATERIAL_FROM_ROW_ABOVE) ? (
                  <>
                    <span className="text-muted-foreground">(blank in source)</span>{" "}
                    <span className="text-sm text-muted-foreground">
                      row above: {r.material.raw}
                    </span>
                  </>
                ) : (
                  r.material.raw
                )}
              </TableCell>
              <TableCell className="whitespace-normal">{cell(observed(r, "microgravity burn length"))}</TableCell>
              <TableCell className="whitespace-normal">{cell(observed(r, "1-g burn length"))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
