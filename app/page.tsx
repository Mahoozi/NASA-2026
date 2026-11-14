// Person A — landing page. Every number is computed from data/ at build time.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { ArrowRightIcon, ExternalLinkIcon } from "lucide-react";
import investigationsJson from "@/data/investigations.json";
import runsJson from "@/data/runs.json";
import type { Investigation, Run } from "@/lib/schema";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HigherOxygenNote } from "./lab/higher-oxygen-note";
import { presets, scenarioToQuery } from "./lab/scenario";

const REPO = "https://github.com/Mahoozi/NASA-2026";

const INCIDENTS = [
  {
    title: "Apollo 1",
    href: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-1",
    text: "In 1967 the crew died in a pre-launch test when fire erupted in their oxygen-filled spacecraft.",
  },
  {
    title: "Apollo 13",
    href: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-13",
    text: "The crew endured an oxygen tank explosion on the way to the Moon.",
  },
  {
    title: "Mir",
    href: "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/",
    text: "A multinational crew survived a fire caused by an oxygen generator failure.",
  },
];

type EvalTotals = {
  citations: number;
  citationsVerified: number;
  refusalsExpected: number;
  refusalsCorrect: number;
};

/** Person B's latest scorecard, if it has been generated. */
function readEvalTotals(): EvalTotals | null {
  const path = join(process.cwd(), "data", "evals.latest.json");
  if (!existsSync(path)) return null;
  const t = JSON.parse(readFileSync(path, "utf8"))?.totals;
  const ok = t && ["citations", "citationsVerified", "refusalsExpected", "refusalsCorrect"].every(
    (k) => typeof t[k] === "number",
  );
  return ok ? (t as EvalTotals) : null;
}

/** "A, B and C" */
const listOf = (xs: string[]) =>
  xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;

function landingFacts() {
  const runs = runsJson as Run[];
  const investigations = investigationsJson as Investigation[];
  const withO2 = runs.filter((r) => r.o2InitialPct !== null);
  const platformOf = (id: string) => investigations.find((i) => i.id === id)?.platform ?? "";
  return {
    totalRuns: runs.length,
    tables: new Set(runs.map((r) => r.investigationId)).size,
    o2Runs: withO2.length,
    // Acronyms of the investigations whose tables record a starting oxygen.
    o2Investigations: [...new Set(withO2.map((r) => r.investigationId))].map(
      (id) => investigations.find((i) => i.id === id)?.acronym || id,
    ),
    maxO2: Math.max(...withO2.map((r) => r.o2InitialPct!)),
    // Runs carry no gravity field; a run counts as lunar or Martian only if its
    // investigation's platform says so in data/investigations.json.
    partialGravityRuns: runs.filter((r) => /moon|lunar|mars|martian/i.test(platformOf(r.investigationId))).length,
  };
}

export default function Home() {
  const f = landingFacts();
  const evals = readEvalTotals();
  const moon = presets(runsJson as Run[]).find((p) => p.id === "moon")!;
  const moonHref = `/lab?${scenarioToQuery(moon.scenario)}`;

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col gap-5 pt-6">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          What NASA has burned in space, and what it hasn&apos;t.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground text-pretty">
          Firebreak ranks NASA&apos;s microgravity combustion investigations for a habitat
          scenario, shows where the evidence runs out, and answers questions only with
          citations it can verify.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/lab" className={buttonVariants({ size: "lg" })}>
            Open the Scenario Lab
          </Link>
          <Link href="/ask" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Ask the evidence
          </Link>
        </div>
      </section>

      <section aria-labelledby="gap-heading" className="flex flex-col gap-4">
        <h2 id="gap-heading" className="text-sm font-medium text-muted-foreground">
          The gap in one line
        </h2>
        <p className="max-w-3xl text-2xl font-medium tracking-tight text-balance">
          {f.o2Runs} solid-material flight tests ({listOf(f.o2Investigations)}) with a
          recorded starting oxygen. Highest: {f.maxO2}%. Planned Moon Base atmosphere: 30% or
          more.
        </p>
        <HigherOxygenNote maxSolidO2={f.maxO2} className="max-w-3xl text-base" />
        <p className="text-sm text-muted-foreground">
          {f.partialGravityRuns} of {f.totalRuns} imported runs were in lunar or Martian gravity.
        </p>
        <div>
          <Link href={moonHref} className={buttonVariants({ variant: "outline" })}>
            See the gap
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="why-heading" className="flex flex-col gap-4">
        <h2 id="why-heading" className="text-xl font-semibold">
          Why it matters
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {INCIDENTS.map((i) => (
            <li key={i.title} className="flex">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>{i.title}</CardTitle>
                  <CardDescription>{i.text}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto">
                  <a
                    href={i.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm underline underline-offset-4 hover:text-foreground"
                  >
                    NASA page
                    <ExternalLinkIcon aria-hidden className="size-3.5" />
                    <span className="sr-only"> about {i.title} (opens in a new tab)</span>
                  </a>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-heading" className="flex flex-col gap-4">
        <h2 id="how-heading" className="text-xl font-semibold">
          How it works
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          <li className="flex">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Real NASA test data</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {f.totalRuns} runs imported from {f.tables} PSI experiment tables; values the
                source can&apos;t support are flagged, never corrected.
              </CardContent>
            </Card>
          </li>
          <li className="flex">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Code ranks, AI explains</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Scenario matching is deterministic; the AI only explains retrieved NASA text.
              </CardContent>
            </Card>
          </li>
          {evals && (
            <li className="flex">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Measured, not assumed</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {evals.citationsVerified} of {evals.citations} citations verified;{" "}
                  {evals.refusalsCorrect} of {evals.refusalsExpected} unanswerable questions
                  correctly refused.
                </CardContent>
                <CardFooter className="mt-auto">
                  <Link href="/evals" className="text-sm underline underline-offset-4 hover:text-foreground">
                    See the scorecard
                  </Link>
                </CardFooter>
              </Card>
            </li>
          )}
        </ul>
      </section>

      <footer className="flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground">
        <p>Built at the 2026 NASA Space Apps Challenge, Montréal. Not affiliated with or endorsed by NASA.</p>
        <p className="flex flex-wrap gap-4">
          <a href={REPO} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
            Source on GitHub
          </a>
          <a
            href={`${REPO}/blob/main/REFERENCES.md`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Data sources
          </a>
        </p>
      </footer>
    </div>
  );
}
