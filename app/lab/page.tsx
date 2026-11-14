// Person A will build this page.
import runs from "@/data/runs.sample.json";
import type { Run } from "@/lib/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const sampleRuns = runs as Run[];

const fmt = (n: number | null) => (n === null ? "—" : String(n));

export default function LabPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Scenario Lab</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run</TableHead>
            <TableHead>Investigation</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>O₂ initial %</TableHead>
            <TableHead>Flow (cm/s)</TableHead>
            <TableHead>Events</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleRuns.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.id}</TableCell>
              <TableCell>{r.investigationId}</TableCell>
              <TableCell>{r.material.raw}</TableCell>
              <TableCell>{fmt(r.o2InitialPct)}</TableCell>
              <TableCell>{r.flowCmS.raw}</TableCell>
              <TableCell>{r.events.join(", ") || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
