// Person B — prevention / detection / suppression strip: which PSI
// investigations inform each kind of fire-safety work, with one verbatim
// sentence from an Objectives section and its source.
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { fireSafetyAreas } from "./data";
import { safetyLabel, shortName } from "./labels";

const BLURB = {
  prevention: "Material flammability: how fires start and spread.",
  detection: "Smoke and aerosol measurement for fire detectors.",
  suppression: "Extinguishing flames with gaseous suppressants.",
} as const;

export function FireSafetyStrip() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {fireSafetyAreas.map(({ area, quote, source, investigations }) => (
        <li key={area} className="flex">
          <Card className="w-full min-w-0" data-testid={`area-${area}`}>
            <CardHeader>
              <CardTitle>{safetyLabel(area)}</CardTitle>
              <CardDescription>{BLURB[area]}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label={`${safetyLabel(area)} investigations`}>
                {investigations.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/investigations/${inv.id}`}
                      translate="no"
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {shortName(inv)}
                    </Link>
                  </li>
                ))}
              </ul>
              <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground text-pretty">
                “{quote}”
              </blockquote>
            </CardContent>
            <CardFooter className="text-xs">
              <a href={source.url} className="underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                Source: {source.title}
              </a>
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  );
}
