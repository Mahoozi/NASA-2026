// Person B — /evals scorecard. Reads data/evals.latest.json; no LLM call at render.
import reportJson from "@/data/evals.latest.json";
import type { EvalReport } from "@/pipeline/evals-result";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ClaimChecks } from "./claim-checks";
import { runClaims } from "./claims";
import { fraction } from "./format";
import { QuestionTable } from "./question-table";

const report = reportJson as EvalReport;
/** When this build computed the claim checks; evaluated once, not per render. */
const BUILT_AT = new Date().toISOString();


function formatRunTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(d) + " UTC";
}

export default function EvalsPage() {
  const { totals: t, items } = report;
  const placeholder = report.model.toLowerCase().startsWith("placeholder");
  const failures = items.filter((i) => !i.statusMatch).length;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Scorecard</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          How the Ask page does on a fixed set of golden questions: some answered by a specific
          NASA source, some comparing two investigations, and some the sources can’t answer,
          where the right result is to say so.
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Model: </span>
          {report.model}
          <span className="text-muted-foreground">. Run at: </span>
          <time dateTime={report.generatedAt}>{formatRunTime(report.generatedAt)}</time>
        </p>
      </div>

      {placeholder && (
        <div
          role="note"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm"
        >
          <p className="font-medium text-destructive">Placeholder: not a real eval run.</p>
          <p className="text-muted-foreground">
            No golden question has been run yet, so every count below is empty. Run{" "}
            <code translate="no" className="font-mono">npm run evals</code> to record real results.
          </p>
        </div>
      )}

      <section aria-labelledby="totals" className="flex flex-col gap-6 rounded-lg border bg-card/60 p-4 backdrop-blur-sm sm:p-6">
        <h2 id="totals" className="text-xl font-bold">
          Totals
        </h2>
        <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          <Total
            className="sm:col-span-2"
            label="Expected result"
            text={`${fraction(t.statusMatches, t.questions)} questions got the expected result`}
            n={t.statusMatches}
            d={t.questions}
          />
          <Total
            label="Answered when the sources hold an answer"
            text={`${fraction(t.answeredCorrect, t.answeredExpected)} answerable questions answered`}
            n={t.answeredCorrect}
            d={t.answeredExpected}
          />
          <Total
            label="Said so when the sources hold no answer"
            text={`${fraction(t.refusalsCorrect, t.refusalsExpected)} unanswerable questions declined`}
            n={t.refusalsCorrect}
            d={t.refusalsExpected}
          />
          <Total
            label="Wrongly declined"
            text={`${fraction(t.wronglyRefused, t.answeredExpected)} answerable questions declined`}
            n={t.wronglyRefused}
            d={t.answeredExpected}
            bad
          />
          <Total
            label="Retrieval"
            text={`${fraction(t.retrievalHits, t.answeredExpected)} answerable questions had every expected source retrieved`}
            n={t.retrievalHits}
            d={t.answeredExpected}
          />
          <Total
            label="Citations verified"
            text={`${fraction(t.citationsVerified, t.citations)} citations matched the source text word for word`}
            n={t.citationsVerified}
            d={t.citations}
          />
          <Total
            label="Citations to an expected source"
            text={`${fraction(t.citationsExpected, t.citationsVerified)} verified citations point to a source the question expects`}
            n={t.citationsExpected}
            d={t.citationsVerified}
          />
        </div>
      </section>

      <ClaimChecks results={runClaims()} checkedAt={BUILT_AT} />

      <section aria-labelledby="questions" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="questions" className="text-xl font-bold">
            Questions
          </h2>
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? "No questions have been run yet."
              : `${failures} of ${items.length} questions did not get the expected result; they are marked below.`}
          </p>
        </div>
        {items.length > 0 && <QuestionTable items={items} />}
      </section>
    </div>
  );
}

function Total({
  label,
  text,
  n,
  d,
  bad = false,
  className,
}: {
  label: string;
  text: string;
  n: number;
  d: number;
  bad?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Progress
        value={d > 0 ? (n / d) * 100 : 0}
        className={cn(bad && "[&_[data-slot=progress-indicator]]:bg-destructive")}
      >
        <ProgressLabel>{label}</ProgressLabel>
      </Progress>
      <p className="text-sm text-muted-foreground tabular-nums">{text}</p>
    </div>
  );
}
