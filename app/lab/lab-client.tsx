"use client";
// Person A — owns the scenario state, which lives in the URL.
// Page order: presets and form → summary + gaps → coverage grid → gap chart
// → ranked investigations → runs table → download.
import { useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { matchInvestigations } from "@/lib/match";
import type { Finding, Investigation, Run, Scenario } from "@/lib/schema";
import { FindingsPanel } from "./findings-panel";
import { PrinterIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { AskLink } from "./ask-link";
import { CoverageGrid } from "./coverage-grid";
import { DownloadDataset } from "./download-dataset";
import { GapChart } from "./gap-chart";
import { evidenceGaps } from "./gaps";
import { GapsPanel } from "./gaps-panel";
import { LimitsPanel } from "./limits-panel";
import { matchingRunIdSet } from "./matching-runs";
import { SPACE_VS_EARTH_ID } from "./gravity-bounds-note";
import { RankedList } from "./ranked-list";
import { reportHref } from "./report/report";
import { createHashScroller } from "./scroll-to-hash";
import { RunsTable } from "./runs-table";
import { hasScoredDimension, parseScenario, presets, scenarioToQuery } from "./scenario";
import { ScenarioForm } from "./scenario-form";
import { SpaceVsEarth } from "./space-vs-earth";
import { WhatVaried } from "./what-varied";
import { Summary } from "./summary";

export function LabClient({
  runs,
  investigations,
  pendingIds,
  findings,
}: {
  runs: Run[];
  investigations: Investigation[];
  pendingIds: string[];
  /** Published findings whose quotes were verified against the corpus. */
  findings: Finding[];
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const scenario = useMemo(() => parseScenario(params), [params]);
  const scored = hasScoredDimension(scenario);
  const presetList = useMemo(() => presets(runs), [runs]);
  const withRuns = useMemo(() => new Set(runs.map((r) => r.investigationId)), [runs]);
  const matches = useMemo(
    () => matchInvestigations(scenario, investigations, runs),
    [scenario, investigations, runs],
  );
  const gaps = useMemo(
    () => evidenceGaps(scenario, runs, investigations),
    [scenario, runs, investigations],
  );
  // Runs that match every run-level dimension set; null when none is set.
  const matchingRunIds = useMemo(() => matchingRunIdSet(scenario, matches), [scenario, matches]);

  // Investigations with runs whose coverage for the scenario is direct or partial.
  const matchedCoverage = useMemo(
    () =>
      new Map(
        scored
          ? matches
              .filter((m) => m.coverage !== "none" && withRuns.has(m.investigation.id))
              .map((m) => [m.investigation.id, m.coverage] as const)
          : [],
      ),
    [scored, matches, withRuns],
  );

  // Native History API: Next keeps useSearchParams in sync, no server round trip.
  // ?investigation=PSI-25 pre-filters the runs table. It is not part of the
  // scenario, so it survives scenario edits and is cleared on its own.
  const investigationId = params.get("investigation");
  const writeUrl = useCallback(
    (scenarioQuery: string, investigation: string | null) => {
      const p = new URLSearchParams(scenarioQuery);
      if (investigation) p.set("investigation", investigation);
      const q = p.toString();
      window.history.replaceState(null, "", q ? `${pathname}?${q}` : pathname);
    },
    [pathname],
  );
  const setScenario = useCallback(
    (next: Scenario) => writeUrl(scenarioToQuery(next), investigationId),
    [writeUrl, investigationId],
  );
  // A link such as /lab#varied-heading: the sections only exist once this component
  // has rendered, after the URL scenario was applied, so scroll once, after paint.
  const scrollToHash = useRef<ReturnType<typeof createHashScroller> | null>(null);
  useEffect(() => {
    scrollToHash.current ??= createHashScroller(document, () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    const scroller = scrollToHash.current;
    const frame = requestAnimationFrame(() => scroller(window.location.hash));
    return () => cancelAnimationFrame(frame);
  }, []);

  // After a preset, bring the summary, gaps panel and coverage grid into view.
  const showSummary = () =>
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document
        .getElementById("summary-heading")
        ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  const clearInvestigation = () => writeUrl(scenarioToQuery(scenario), null);

  const focus = investigationId
    ? investigations.find((i) => i.id === investigationId) ?? null
    : null;
  const tableRuns = useMemo(
    () => (investigationId ? runs.filter((r) => r.investigationId === investigationId) : runs),
    [runs, investigationId],
  );
  const runSources = useMemo(
    () =>
      [...new Set(runs.map((r) => r.investigationId))].map(
        (id) => investigations.find((i) => i.id === id) ?? { id, acronym: id },
      ),
    [runs, investigations],
  );

  return (
    <div className="flex flex-col gap-10">
      <ScenarioForm
        scenario={scenario}
        presets={presetList}
        onChange={setScenario}
        onPreset={showSummary}
      />

      <section aria-labelledby="summary-heading" className="flex flex-col gap-4">
        <h2 id="summary-heading" className="scroll-mt-4 text-lg font-semibold">
          Summary
        </h2>
        {scored ? (
          <>
            <Summary matches={matches} withRuns={withRuns} />
            <GapsPanel report={gaps} />
            <div>
              <AskLink scenario={scenario} matches={matches} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick a preset or set material, oxygen, airflow, gravity or safety area.
            Pressure alone is not scored.
          </p>
        )}
      </section>

      <section aria-labelledby="grid-heading" className="flex flex-col gap-3">
        <h2 id="grid-heading" className="text-lg font-semibold">
          Coverage grid: runs by material and starting oxygen
        </h2>
        <CoverageGrid
          runs={runs}
          investigations={investigations}
          scenario={scenario}
          onPick={(materialFamily, o2Pct) => {
            const next: Scenario = { ...scenario, materialFamily };
            if (o2Pct === undefined) delete next.o2Pct;
            else next.o2Pct = o2Pct;
            setScenario(next);
          }}
        />
      </section>

      <section aria-labelledby="chart-heading" className="flex flex-col gap-3">
        <h2 id="chart-heading" className="text-lg font-semibold">
          Gap chart: airflow and starting oxygen of every run
        </h2>
        <GapChart runs={runs} scenario={scenario} matchingRunIds={matchingRunIds} />
      </section>

      <section aria-labelledby="limits-heading" className="flex flex-col gap-3">
        <h2 id="limits-heading" className="text-lg font-semibold">
          Recorded flammability limits
        </h2>
        <LimitsPanel runs={runs} scenario={scenario} />
      </section>

      {/* Hidden until data/findings.json has verified entries. */}
      {scored && findings.length > 0 && (
        <section aria-labelledby="findings-heading" className="flex flex-col gap-3">
          <h2 id="findings-heading" className="text-lg font-semibold">
            Published findings
          </h2>
          <FindingsPanel findings={findings} scenario={scenario} />
        </section>
      )}

      <section
        id={SPACE_VS_EARTH_ID}
        aria-labelledby="space-earth-heading"
        className="flex scroll-mt-4 flex-col gap-3"
      >
        <h2 id="space-earth-heading" className="text-lg font-semibold">
          Space vs Earth (Saffire-II)
        </h2>
        <SpaceVsEarth runs={runs} />
      </section>

      {scored && (
        <section className="flex flex-col gap-3" aria-labelledby="ranked-heading">
          <h2 id="ranked-heading" className="text-lg font-semibold">
            Ranked investigations
          </h2>
          <RankedList matches={matches} pendingIds={pendingIds} withRuns={withRuns} />
        </section>
      )}

      <section aria-labelledby="varied-heading" className="flex flex-col gap-3">
        <h2 id="varied-heading" className="text-lg font-semibold">
          What varied and what was held fixed
        </h2>
        <WhatVaried runs={runs} investigations={investigations} matchedCoverage={matchedCoverage} />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="runs-heading">
        <div className="flex flex-col gap-1">
          <h2 id="runs-heading" className="text-lg font-semibold">
            Imported runs
          </h2>
          <p className="text-sm text-muted-foreground">
            {runSources.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ", "}
                <Link
                  href={`/investigations/${encodeURIComponent(s.id)}`}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {s.id} ({s.acronym || s.id})
                </Link>
              </span>
            ))}
            : {runs.length} runs,{" "}
            {runs.filter((r) => r.flags.length).length} with data-quality flags. Values are as
            recorded in the source table; flagged values were not corrected.
          </p>
        </div>
        {investigationId && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              {tableRuns.length
                ? `Showing runs from ${investigationId}${focus?.acronym ? ` (${focus.acronym})` : ""} only.`
                : focus
                  ? `No test-level data imported for ${investigationId}${focus.acronym ? ` (${focus.acronym})` : ""}.`
                  : `${investigationId} is not an imported investigation.`}
            </p>
            <Button variant="outline" size="sm" onClick={clearInvestigation}>
              Show runs from all investigations
            </Button>
          </div>
        )}
        {(tableRuns.length > 0 || !investigationId) && (
          <RunsTable runs={tableRuns} matchingRunIds={matchingRunIds} />
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="download-heading">
        <h2 id="download-heading" className="text-lg font-semibold">
          Download
        </h2>
        <DownloadDataset
          runs={runs}
          extra={
            <Link href={reportHref(scenario)} className={buttonVariants({ variant: "outline" })}>
              <PrinterIcon data-icon="inline-start" />
              Print or save as PDF
            </Link>
          }
        />
      </section>
    </div>
  );
}
