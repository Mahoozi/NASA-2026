// Person A (requested for the investigations page) — "Hardware groups". The
// brief's own sentence for each group, then its investigations; everything else
// is listed with its stored facility text. Quoted and stored text carries
// data-quoted so tests can tell it from Firebreak's own wording.
import Link from "next/link";
import runsJson from "../../data/runs.json";
import type { Investigation, Run } from "../../lib/schema";
import { BRIEF_URL, displayBriefQuote } from "../brief/brief-text";
import { groupInvestigations } from "./hardware";
import { fuelPhaseText, labHref } from "./labels";

const linkClass = "underline underline-offset-4 hover:text-foreground";

export const HARDWARE_INTRO =
  "Grouped by the hardware families the challenge brief names. Investigations the brief does not place in one of them are listed separately, with their stored facility text.";

const label = (inv: Investigation) => inv.acronym || inv.name;

export function HardwareGroups({ investigations }: { investigations: Investigation[] }) {
  const runCounts = new Map<string, number>();
  for (const r of runsJson as Run[]) runCounts.set(r.investigationId, (runCounts.get(r.investigationId) ?? 0) + 1);
  const { groups, rest } = groupInvestigations(investigations);

  return (
    <section aria-labelledby="hardware-heading" className="flex scroll-mt-4 sm:scroll-mt-20 flex-col gap-4">
      <div className="flex max-w-prose flex-col gap-1">
        <h2 id="hardware-heading" className="text-xl font-bold">
          Hardware groups
        </h2>
        <p className="text-sm text-muted-foreground">{HARDWARE_INTRO}</p>
      </div>

      {groups.map(({ group, members }) => (
        <div key={group.id} data-group={group.id} className="flex min-w-0 flex-col gap-3 rounded-lg border p-4 bg-card/60 backdrop-blur-sm">
          <h3 className="text-base font-semibold text-balance">{group.name}</h3>
          <figure className="flex flex-col gap-1">
            <blockquote data-quoted="brief" className="border-l-2 pl-3 text-sm leading-relaxed italic">
              {displayBriefQuote(group.briefQuote)}
            </blockquote>
            <figcaption className="text-sm text-muted-foreground">
              <a href={BRIEF_URL} target="_blank" rel="noreferrer" className={linkClass}>
                Challenge brief
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </figcaption>
          </figure>
          <ul className="flex flex-col gap-2 text-sm">
            {members.map((inv) => {
              const runs = runCounts.get(inv.id) ?? 0;
              return (
                <li key={inv.id} data-investigation={inv.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={`/investigations/${encodeURIComponent(inv.id)}`} translate="no" className={`font-medium ${linkClass}`}>
                    {label(inv)}
                  </Link>
                  <span className="text-muted-foreground">{fuelPhaseText(inv)}</span>
                  {runs > 0 && (
                    <Link href={labHref(inv.id)} className={linkClass}>
                      {runs} {runs === 1 ? "run" : "runs"} in the Lab
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div data-group="rest" className="flex min-w-0 flex-col gap-3 rounded-lg border p-4 bg-card/60 backdrop-blur-sm">
        <h3 className="text-base font-semibold text-balance">Not in the brief&apos;s hardware groups</h3>
        <ul className="flex flex-col gap-2 text-sm">
          {rest.map((inv) => {
            const runs = runCounts.get(inv.id) ?? 0;
            return (
              <li key={inv.id} data-investigation={inv.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link href={`/investigations/${encodeURIComponent(inv.id)}`} translate="no" className={`font-medium ${linkClass}`}>
                  {label(inv)}
                </Link>
                <span className="text-muted-foreground">({inv.id})</span>
                <span data-quoted="facility" className="break-words">
                  {inv.facility || <span className="text-muted-foreground italic">facility not stated</span>}
                </span>
                {runs > 0 && (
                  <Link href={labHref(inv.id)} className={linkClass}>
                    {runs} {runs === 1 ? "run" : "runs"} in the Lab
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
