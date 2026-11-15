// Person A — the printable scenario report. Every number and sentence comes from the
// Lab's own functions via buildScenarioReport. On screen it follows the site theme at
// 14 px or larger; the print stylesheet (report.css) makes it black on white.
// Stored text (flags, source quotes, finding claims) carries data-quoted for tests.
import Link from "next/link";
import { LIMITS_PANEL_TEXT as T, describePoint } from "../../../lib/limits";
import { FINDINGS_EMPTY, FindingsPanel } from "../findings-panel";
import { NO_GAPS_TEXT } from "../gaps";
import { GravityBoundsNote } from "../gravity-bounds-note";
import { HigherOxygenNote } from "../higher-oxygen-note";
import { materialLabel } from "../material-label";
import { flowText, outcomeText } from "../run-order";
import { COVERAGE_LABEL, DIMENSION_LABEL, investigationLabel, NO_COVERAGE } from "../summary";
import { PrintButton } from "./print-button";
import { PRESSURE_CONTEXT_NOTE, REPORT_FOOTER, distinctSources, labHref, type ScenarioReport } from "./report";

const linkClass = "underline underline-offset-4";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="keep-heading flex flex-col gap-2">
      <h2 id={`${id}-heading`} className="border-b pb-1 text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ScenarioReportView({ report: r }: { report: ScenarioReport }) {
  const { gaps, limits } = r;
  const matchedRuns = r.matching;
  return (
    <article className="report mx-auto flex max-w-3xl flex-col gap-6 text-base">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Firebreak scenario report</h1>
        <p>Generated {r.generatedOn} (UTC)</p>
        <p className="break-all">
          Scenario in the Lab:{" "}
          <a href={r.labUrl} className={`${linkClass} no-url`}>
            {r.labUrl}
          </a>
        </p>
        <div className="report-screen-only flex flex-wrap gap-3 pt-2">
          <PrintButton />
          <Link href={labHref(r.scenario)} className={`${linkClass} self-center`}>
            Back to the Lab
          </Link>
        </div>
      </header>

      <Section id="scenario" title="Scenario">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          {r.fields.map((f) => (
            <div key={f.label} className="contents">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        {r.presets.length > 0 && (
          <div className="flex flex-col gap-1">
            <p>
              Matches the Lab preset: <span className="font-medium">{r.presets.map((p) => p.label).join(", ")}</span>
            </p>
            {distinctSources(r.presets).map((source) => {
              const preset = r.presets.find((p) => p.source === source)!;
              return (
                <p key={source} className="text-muted-foreground">
                  Source:{" "}
                  <span data-quoted="preset-source">
                    {preset.sourceUrl ? (
                      <a href={preset.sourceUrl} target="_blank" rel="noreferrer" className={linkClass}>
                        {source}
                      </a>
                    ) : (
                      source
                    )}
                  </span>
                </p>
              );
            })}
          </div>
        )}
      </Section>

      <Section id="gaps" title="Where the evidence runs out">
        {gaps.gaps.length ? (
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {gaps.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        ) : (
          <p>{NO_GAPS_TEXT}</p>
        )}
        {gaps.aboveSolidO2 !== undefined && <HigherOxygenNote maxSolidO2={gaps.aboveSolidO2} />}
        {gaps.nearest.length > 0 && (
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">Nearest evidence</h3>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {gaps.nearest.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section id="ranked" title="Ranked investigations">
        {r.ranked.length === 0 ? (
          <p>{NO_COVERAGE}</p>
        ) : (
          <>
            <ol className="flex flex-col gap-2">
              {r.ranked.map((m, i) => {
                const n = m.matchingRunIds.length;
                return (
                  <li key={m.investigation.id} className="keep flex flex-col gap-0.5">
                    <p>
                      <span className="font-medium">
                        {i + 1}. {investigationLabel(m.investigation)}
                      </span>{" "}
                      ({m.investigation.id}), {COVERAGE_LABEL[m.coverage]}, closeness {m.score.toFixed(2)}
                    </p>
                    <p className="text-muted-foreground">
                      {Object.entries(m.breakdown)
                        .map(([dim, v]) => `${DIMENSION_LABEL[dim] ?? dim} ${v.toFixed(2)}`)
                        .join(" · ")}
                      {" · "}
                      {r.withRuns.has(m.investigation.id)
                        ? `${n} matching run${n === 1 ? "" : "s"}`
                        : "no test-level data imported"}
                    </p>
                    <p className="text-muted-foreground">
                      {m.investigation.name} ·{" "}
                      <a href={m.investigation.url} target="_blank" rel="noreferrer" className={linkClass}>
                        PSI page
                      </a>
                    </p>
                  </li>
                );
              })}
            </ol>
            {r.unlisted > 0 && (
              <p className="text-muted-foreground">
                {r.unlisted} other imported investigation{r.unlisted === 1 ? "" : "s"} score 0 for this scenario and{" "}
                {r.unlisted === 1 ? "is" : "are"} not listed.
              </p>
            )}
          </>
        )}
      </Section>

      <Section id="runs" title="Matching runs">
        {matchedRuns.total === null ? (
          <p>No run-level dimension is set (material, oxygen, airflow or gravity), so no runs are matched.</p>
        ) : matchedRuns.total === 0 ? (
          <p>No run matches every run-level dimension you set.</p>
        ) : (
          <>
            <p>
              Showing the first {matchedRuns.shown.length} of {matchedRuns.total} runs that match every run-level
              dimension you set, in the Lab&apos;s table order (investigation, then test id). The Lab lists all of them,
              and the CSV download has every field.
            </p>
            {/* Scrolls inside its own box on a narrow screen; printed, it is not clipped. */}
            <div className="report-table-scroll relative max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Matching runs, scrolls sideways on narrow screens">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b">
                  <th scope="col" className="py-1 pr-2 font-semibold">Test</th>
                  <th scope="col" className="py-1 pr-2 font-semibold">Material</th>
                  <th scope="col" className="py-1 pr-2 font-semibold">Start O₂</th>
                  <th scope="col" className="py-1 pr-2 font-semibold">Airflow (cm/s)</th>
                  <th scope="col" className="py-1 pr-2 font-semibold">Outcome</th>
                  <th scope="col" className="py-1 font-semibold">Flags</th>
                </tr>
              </thead>
              <tbody>
                {matchedRuns.shown.map((run) => (
                  <tr key={run.id} className="border-b align-top">
                    <td className="py-1 pr-2 font-medium">
                      {run.investigationId} {run.testId}
                    </td>
                    <td className="py-1 pr-2">
                      {materialLabel(run)}
                      <span data-quoted="material" className="block text-muted-foreground">
                        {run.material.raw}
                      </span>
                    </td>
                    <td className="py-1 pr-2">{run.o2InitialPct === null ? "not recorded" : `${run.o2InitialPct}%`}</td>
                    <td className="py-1 pr-2">{flowText(run) ?? "not recorded"}</td>
                    <td className="py-1 pr-2">{outcomeText(run)}</td>
                    <td data-quoted="flags" className="py-1">
                      {run.flags.length ? (
                        <ul className="list-disc pl-4">
                          {run.flags.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      ) : (
                        "none"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Section>

      <Section id="limits" title={T.title}>
        {limits.kind === "refusal" && (
          <>
            <p className="font-medium">{limits.text}</p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {limits.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </>
        )}
        {limits.kind === "needs-material" && <p>{limits.text}</p>}
        {limits.kind === "limits" && (
          <>
            <h3 className="font-medium">
              {T.nearestHeading}: {limits.envelope.family}
            </h3>
            <ul data-quoted="limits" className="flex list-disc flex-col gap-1 pl-5">
              {limits.nearest.map((p) => (
                <li key={p.runId}>{describePoint(p)}</li>
              ))}
            </ul>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {limits.position.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section id="findings" title="Published findings">
        {r.findings.length ? (
          <div data-quoted="findings">
            <FindingsPanel findings={r.findings.map((m) => m.finding)} scenario={r.scenario} />
          </div>
        ) : (
          <p>{FINDINGS_EMPTY}</p>
        )}
      </Section>

      <Section id="caveats" title="Caveats that apply">
        {r.caveats.partialGravity && <GravityBoundsNote />}
        {r.caveats.pressure && <p>{PRESSURE_CONTEXT_NOTE}</p>}
        {!r.caveats.partialGravity && !r.caveats.pressure && <p>No scenario-specific caveat applies.</p>}
      </Section>

      <Section id="sources" title="Sources">
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {r.sources.map((s) => (
            <li key={s.url}>
              {s.label}:{" "}
              <a href={s.url} target="_blank" rel="noreferrer" className={`${linkClass} no-url break-all`}>
                {s.url}
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <footer className="border-t pt-3">
        <p>{REPORT_FOOTER}</p>
      </footer>
    </article>
  );
}

export function EmptyReport({ message }: { message: string }) {
  return (
    <article className="report mx-auto flex max-w-3xl flex-col gap-4 text-base">
      <h1 className="text-2xl font-semibold">Firebreak scenario report</h1>
      <p>{message}</p>
      <p>
        <Link href="/lab" className={linkClass}>
          Back to the Scenario Lab
        </Link>
      </p>
    </article>
  );
}
