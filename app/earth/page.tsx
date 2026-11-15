// Person A — Earth applications. Three parts per topic, never mixed: the
// challenge brief's words, the PSI record's words, and NASA Spinoff links.
// Quoted text carries data-quoted so tests can tell it from our own wording.
import type { Metadata } from "next";
import Link from "next/link";
import runsJson from "../../data/runs.json";
import type { Run } from "../../lib/schema";
import { CHALLENGE_BRIEF_URL } from "../lab/higher-oxygen-note";
import {
  EARTH_INTRO,
  EARTH_SECTIONS,
  type EarthSection,
  investigationsById,
  NO_SPINOFF,
  nomexRuns,
  runFields,
  SPINOFF_LABEL,
  splitSentences,
} from "./content";

export const metadata: Metadata = { title: "Earth applications · Firebreak" };

const linkClass = "underline underline-offset-4 hover:text-foreground";
const quoted = "text-sm leading-relaxed break-words whitespace-pre-line";

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function PsiRecord({ id }: { id: string }) {
  const inv = investigationsById.get(id);
  if (!inv) return null;
  const text = inv.earthBenefits;
  const { lead, rest } = text ? splitSentences(text) : { lead: "", rest: "" };
  return (
    <li className="flex min-w-0 flex-col gap-2">
      <p className="text-sm">
        <Link href={`/investigations/${encodeURIComponent(inv.id)}`} translate="no" className={`font-medium ${linkClass}`}>
          {inv.acronym || inv.id}
        </Link>{" "}
        <span className="text-muted-foreground">({inv.id}) · earth benefits text from the PSI record</span>
      </p>
      {text ? (
        <>
          <p data-quoted="psi" className={quoted}>
            {lead}
          </p>
          {rest && (
            <details className="text-sm">
              <summary className="w-fit cursor-pointer text-muted-foreground underline underline-offset-4 hover:text-foreground">
                Show the full text
              </summary>
              <p data-quoted="psi" className={`${quoted} mt-2`}>
                {rest}
              </p>
            </details>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">Not given in the PSI record.</p>
      )}
    </li>
  );
}

function NomexRun({ run }: { run: Run }) {
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-md border p-3">
      <p className="text-sm">
        Saffire-II sample that includes Nomex, copied from the imported runs.{" "}
        <Link href="/lab?investigation=PSI-99" className={linkClass}>
          Open Saffire-II in the Lab
        </Link>
        .
      </p>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        {runFields(run).map((f, i) => (
          <div key={i} className="contents">
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd data-quoted="run" className="break-words">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

function Section({ section, runs }: { section: EarthSection; runs: Run[] }) {
  const nomex = section.nomexRun ? nomexRuns(runs) : [];
  return (
    <section
      aria-labelledby={`${section.id}-heading`}
      className="flex min-w-0 flex-col gap-5 rounded-lg border p-4 sm:p-5"
    >
      <h2 id={`${section.id}-heading`} className="text-xl font-semibold text-balance">
        {section.heading}
      </h2>

      <Part title="From the challenge brief">
        <figure className="flex flex-col gap-1">
          <blockquote data-quoted="brief" className="border-l-2 pl-3 text-sm leading-relaxed italic">
            …{section.briefQuote}…
          </blockquote>
          <figcaption className="text-sm text-muted-foreground">
            <Ext href={CHALLENGE_BRIEF_URL}>NASA Space Apps challenge brief</Ext>
          </figcaption>
        </figure>
      </Part>

      <Part title="What the PSI record says">
        <ul className="flex flex-col gap-5">
          {section.psiIds.map((id) => (
            <PsiRecord key={id} id={id} />
          ))}
          {nomex.map((r) => (
            <NomexRun key={r.id} run={r} />
          ))}
        </ul>
      </Part>

      <Part title="NASA Spinoffs">
        {section.spinoffs.length ? (
          <ul className="flex flex-col gap-2 text-sm">
            {section.spinoffs.map((s) => (
              <li key={s.url}>
                <Ext href={s.url}>{s.title}</Ext>{" "}
                <span className="text-muted-foreground">· {SPINOFF_LABEL}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{NO_SPINOFF}</p>
        )}
      </Part>
    </section>
  );
}

export default function EarthPage() {
  const runs = runsJson as Run[];
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-prose flex-col gap-2">
        <h1 className="text-2xl font-semibold">Earth applications</h1>
        <p className="text-base text-pretty text-muted-foreground">{EARTH_INTRO}</p>
      </div>
      {EARTH_SECTIONS.map((s) => (
        <Section key={s.id} section={s} runs={runs} />
      ))}
    </div>
  );
}
