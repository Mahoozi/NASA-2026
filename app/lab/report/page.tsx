// Person A — /lab/report: a printable report for the scenario in the URL. It reads the
// same parameters as /lab, so a Lab link and its report differ only by the path.
import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import corpusJson from "../../../data/corpus.json";
import findingsJson from "../../../data/findings.json";
import investigationsJson from "../../../data/investigations.json";
import runsJson from "../../../data/runs.json";
import type { CorpusDoc, Finding, Investigation, Run } from "../../../lib/schema";
import { verifiedFindings } from "../findings";
import { hasScoredDimension, parseScenario } from "../scenario";
import "./report.css";
import { buildScenarioReport, NO_SCENARIO_TEXT } from "./report";
import { EmptyReport, ScenarioReportView } from "./scenario-report";

export const metadata: Metadata = { title: "Firebreak scenario report" };

/** The static shell; the report itself needs the request (URL parameters, host), so it streams in. */
export default function ReportPage({ searchParams }: PageProps<"/lab/report">) {
  return (
    <Suspense fallback={<p className="text-base text-muted-foreground">Preparing the report…</p>}>
      <ReportBody searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportBody({ searchParams }: Pick<PageProps<"/lab/report">, "searchParams">) {
  // The report carries today's date and the host it was opened on: render per request.
  await connection();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string") params.set(key, first);
  }
  const scenario = parseScenario(params);
  if (!hasScoredDimension(scenario)) return <EmptyReport message={NO_SCENARIO_TEXT} />;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const report = buildScenarioReport({
    scenario,
    runs: runsJson as Run[],
    investigations: investigationsJson as Investigation[],
    findings: verifiedFindings(findingsJson as Finding[], corpusJson as CorpusDoc[]),
    generatedOn: new Date().toISOString().slice(0, 10),
    origin: host ? `${proto}://${host}` : null,
  });
  return <ScenarioReportView report={report} />;
}
