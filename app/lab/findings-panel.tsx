// Person A — "Published findings" panel. Shows up to three verified findings
// whose tags overlap the scenario. The claim and quote come from
// data/findings.json unchanged; this file adds only neutral labels.
import type { Finding, Scenario } from "@/lib/schema";
import { FINDING_LABEL, relevantFindings } from "./findings";
import { nested } from "./gravity-bounds-note";

export const FINDINGS_EMPTY =
  "No published finding in the corpus is tagged for the material, oxygen, airflow or gravity of this scenario.";

export function FindingsPanel({ findings, scenario }: { findings: Finding[]; scenario: Scenario }) {
  const matched = relevantFindings(scenario, findings);
  if (matched.length === 0) return <p className="text-sm text-muted-foreground">{FINDINGS_EMPTY}</p>;
  return (
    <ul className="flex flex-col gap-4">
      {matched.map(({ finding: f, overlaps }) => (
        <li key={f.id} className="flex flex-col gap-2 rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">{FINDING_LABEL}</p>
          <p>{f.claim}</p>
          <blockquote className="border-l-2 pl-3 text-sm italic">“{nested(f.quote)}”</blockquote>
          <p className="text-sm text-muted-foreground">
            <a
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {f.sourceTitle}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>{" "}
            ({f.year}){f.investigations.length > 0 && ` · ${f.investigations.join(", ")}`} · Tags
            overlap your scenario on: {overlaps.join(", ")}
          </p>
        </li>
      ))}
    </ul>
  );
}
