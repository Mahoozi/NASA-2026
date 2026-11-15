"use client";
// Person B — side-by-side comparison of every investigation, filterable by
// safety area and fuel phase, sortable by column. Values come straight from
// data/investigations.json; empty fields show "not stated", never a guess.
import { useState } from "react";
import Link from "next/link";
import type { Investigation, SafetyArea } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SAFETY_AREAS, labHref, safetyLabel } from "./labels";

type FuelPhase = Investigation["fuelPhase"][number];
const FUEL_PHASES: FuelPhase[] = ["solid", "liquid droplet", "gas"];
type FuelFilter = FuelPhase | "none";

type SortKey = "id" | "acronym" | "safety" | "fuel" | "facility" | "runs";
const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "acronym", label: "Acronym" },
  { key: "safety", label: "Safety area" },
  { key: "fuel", label: "Fuel phase" },
  { key: "facility", label: "Hardware / facility" },
  { key: "runs", label: "Run data in the Lab" },
];

const idNum = (id: string) => Number(id.replace(/^PSI-/, ""));
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Sort value; empty strings sort last whatever the direction. */
function sortValue(inv: Investigation, key: SortKey): string | number {
  switch (key) {
    case "id": return idNum(inv.id);
    case "acronym": return inv.acronym;
    case "safety": return inv.safetyArea.join(", ");
    case "fuel": return inv.fuelPhase.join(", ");
    case "facility": return inv.facility;
    case "runs": return inv.hasRunData ? 0 : 1;
  }
}

function compare(a: Investigation, b: Investigation, key: SortKey, dir: 1 | -1): number {
  const va = sortValue(a, key);
  const vb = sortValue(b, key);
  if (va === "" && vb !== "") return 1;
  if (vb === "" && va !== "") return -1;
  const c = typeof va === "number" && typeof vb === "number" ? va - vb : collator.compare(String(va), String(vb));
  return c !== 0 ? c * dir : idNum(a.id) - idNum(b.id);
}

const NotStated = () => <span className="text-muted-foreground italic">not stated</span>;

export function CompareTable({ investigations }: { investigations: Investigation[] }) {
  const [area, setArea] = useState<SafetyArea | null>(null);
  const [fuel, setFuel] = useState<FuelFilter | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "id", dir: 1 });

  const rows = investigations
    .filter((i) => !area || i.safetyArea.includes(area))
    .filter((i) => !fuel || (fuel === "none" ? i.fuelPhase.length === 0 : i.fuelPhase.includes(fuel)))
    .sort((a, b) => compare(a, b, sort.key, sort.dir)); // filter() already returned a copy

  const areaItems = [
    { label: "All safety areas", value: null as SafetyArea | null },
    ...SAFETY_AREAS.map((a) => ({ label: a.label, value: a.value as SafetyArea | null })),
  ];
  const fuelItems = [
    { label: "All fuel phases", value: null as FuelFilter | null },
    ...FUEL_PHASES.map((f) => ({ label: f, value: f as FuelFilter | null })),
    { label: "not stated", value: "none" as FuelFilter | null },
  ];

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-full sm:w-56">
          <FieldLabel htmlFor="compare-area">Safety area</FieldLabel>
          <Select items={areaItems} value={area} onValueChange={(v) => setArea(v as SafetyArea | null)}>
            <SelectTrigger id="compare-area" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {areaItems.map((item) => (
                  <SelectItem key={item.value ?? "all"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-full sm:w-56">
          <FieldLabel htmlFor="compare-fuel">Fuel phase</FieldLabel>
          <Select items={fuelItems} value={fuel} onValueChange={(v) => setFuel(v as FuelFilter | null)}>
            <SelectTrigger id="compare-fuel" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {fuelItems.map((item) => (
                  <SelectItem key={item.value ?? "all"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <p className="text-sm text-muted-foreground tabular-nums sm:ml-auto" aria-live="polite">
          {rows.length} of {investigations.length} investigations
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <TableHead
                    key={c.key}
                    aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                    >
                      {c.label}
                      <span aria-hidden className="text-muted-foreground">
                        {active ? (sort.dir === 1 ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((inv) => (
                <TableRow key={inv.id} data-testid="compare-row">
                  <TableCell translate="no" className="font-medium">
                    <Link href={`/investigations/${inv.id}`} className="underline-offset-4 hover:underline">
                      {inv.id}
                    </Link>
                  </TableCell>
                  <TableCell translate="no">
                    {inv.acronym ? (
                      <Link href={`/investigations/${inv.id}`} className="underline-offset-4 hover:underline">
                        {inv.acronym}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground italic" title="PSI lists no acronym for this investigation">
                        none in PSI
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {inv.safetyArea.map((s) => (
                        <Badge key={s} variant="secondary">
                          {safetyLabel(s)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{inv.fuelPhase.length ? inv.fuelPhase.join(", ") : <NotStated />}</TableCell>
                  <TableCell className="max-w-72 min-w-56 whitespace-normal">{inv.facility || <NotStated />}</TableCell>
                  <TableCell>
                    {inv.hasRunData ? (
                      <Link href={labHref(inv.id)} className="font-medium underline-offset-4 hover:underline">
                        Yes, open in Lab
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="text-muted-foreground">
                  No investigation matches both filters. Choose another safety area or fuel phase.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
