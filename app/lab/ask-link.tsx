// Person A — hand the scenario to Person B's /ask page.
// URL contract (plan/A.md Stage 3): /ask?scenario=<json>&investigations=PSI-25,PSI-xx
// with the top 3 investigations scoring above 0. If /ask does not read the
// params yet, this is still a plain link to the page.
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { InvestigationMatch, Scenario } from "@/lib/schema";
import { buttonVariants } from "@/components/ui/button";

export function askHref(scenario: Scenario, matches: InvestigationMatch[]): string {
  const ids = matches
    .filter((m) => m.score > 0)
    .slice(0, 3)
    .map((m) => m.investigation.id);
  const p = new URLSearchParams({ scenario: JSON.stringify(scenario) });
  if (ids.length) p.set("investigations", ids.join(","));
  return `/ask?${p.toString()}`;
}

export function AskLink({
  scenario,
  matches,
}: {
  scenario: Scenario;
  matches: InvestigationMatch[];
}) {
  return (
    <Link href={askHref(scenario, matches)} className={buttonVariants({ variant: "outline" })}>
      Ask about this scenario
      <ArrowRightIcon data-icon="inline-end" />
    </Link>
  );
}
