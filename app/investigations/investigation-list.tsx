"use client";
// Person B — investigation cards with a safety-area filter kept in ?area=.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Investigation, SafetyArea } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SAFETY_AREAS, fuelPhaseText, labHref, safetyLabel, shortName } from "./labels";

const isArea = (v: string | null): v is SafetyArea => SAFETY_AREAS.some((a) => a.value === v);

/** Reads and writes the filter in the URL. Render inside <Suspense>. */
export function InvestigationBrowser({ investigations }: { investigations: Investigation[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const param = useSearchParams().get("area");
  const area = isArea(param) ? param : null;

  const setArea = (next: SafetyArea | null) => {
    const params = new URLSearchParams(window.location.search);
    if (next) params.set("area", next);
    else params.delete("area");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return <InvestigationList investigations={investigations} area={area} onAreaChange={setArea} />;
}

export function InvestigationList({
  investigations,
  area,
  onAreaChange,
}: {
  investigations: Investigation[];
  area: SafetyArea | null;
  onAreaChange?: (area: SafetyArea | null) => void;
}) {
  const shown = area ? investigations.filter((i) => i.safetyArea.includes(area)) : investigations;
  const count = (a: SafetyArea) => investigations.filter((i) => i.safetyArea.includes(a)).length;
  const items = [
    { label: `All safety areas (${investigations.length})`, value: null as SafetyArea | null },
    ...SAFETY_AREAS.map((a) => ({ label: `${a.label} (${count(a.value)})`, value: a.value })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field className="w-full sm:w-64">
          <FieldLabel htmlFor="safety-area">Safety area</FieldLabel>
          <Select items={items} value={area} onValueChange={(v) => onAreaChange?.(v as SafetyArea | null)}>
            <SelectTrigger id="safety-area" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {items.map((item) => (
                  <SelectItem key={item.value ?? "all"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
          Showing {shown.length} of {investigations.length}
        </p>
      </div>

      {shown.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {shown.map((inv) => (
            <li key={inv.id} className="flex">
              <InvestigationCard inv={inv} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No investigations in this safety area. Choose another area or show all.
        </p>
      )}
    </div>
  );
}

function InvestigationCard({ inv }: { inv: Investigation }) {
  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline gap-x-2">
          <Link
            href={`/investigations/${inv.id}`}
            translate="no"
            className="underline-offset-4 hover:underline"
          >
            {shortName(inv)}
          </Link>
          {inv.acronym && (
            <span translate="no" className="text-sm font-normal text-muted-foreground">
              {inv.id}
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-pretty">{inv.name}</CardDescription>
        {inv.hasRunData && (
          <CardAction>
            <Badge>Has run data</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Safety area</dt>
          <dd className="flex flex-wrap gap-1">
            {inv.safetyArea.map((s) => (
              <Badge key={s} variant="secondary">
                {safetyLabel(s)}
              </Badge>
            ))}
          </dd>
          <dt className="text-muted-foreground">Fuel phase</dt>
          <dd className={inv.fuelPhase.length ? undefined : "text-muted-foreground italic"}>
            {fuelPhaseText(inv)}
          </dd>
          <dt className="text-muted-foreground">Platform</dt>
          <dd>{inv.platform || <span className="text-muted-foreground italic">not stated</span>}</dd>
        </dl>
      </CardContent>
      <CardFooter className="gap-4">
        <Link href={`/investigations/${inv.id}`} className="font-medium underline-offset-4 hover:underline">
          View details
        </Link>
        {inv.hasRunData && (
          <Link href={labHref(inv.id)} className="font-medium underline-offset-4 hover:underline">
            Open in Lab
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
