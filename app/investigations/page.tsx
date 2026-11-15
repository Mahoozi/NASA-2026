// Person B
import { Suspense } from "react";
import { InvestigationBrowser, InvestigationList } from "./investigation-list";
import { investigations } from "./data";
import { CompareTable } from "./compare-table";
import { FireSafetyStrip } from "./fire-safety-strip";
import { HardwareGroups } from "./hardware-groups";

export default function InvestigationsPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl text-balance">Investigations</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          The {investigations.length} combustion investigations in NASA’s Physical Sciences
          Informatics (PSI) system. Each page shows the investigation’s own PSI text and links back
          to the source.
        </p>
      </div>
      <section aria-labelledby="fire-safety-heading" className="flex flex-col gap-3">
        <h2 id="fire-safety-heading" className="text-xl font-bold">
          Prevention · Detection · Suppression
        </h2>
        <FireSafetyStrip />
      </section>

      <section aria-labelledby="compare-heading" className="flex flex-col gap-3">
        <h2 id="compare-heading" className="text-xl font-bold">
          Compare investigations
        </h2>
        <CompareTable investigations={investigations} />
      </section>

      <HardwareGroups investigations={investigations} />

      <section aria-labelledby="all-heading" className="flex flex-col gap-3">
        <h2 id="all-heading" className="text-xl font-bold">
          All investigations
        </h2>
        {/* The fallback is the unfiltered list, so the static HTML has every card. */}
        <Suspense fallback={<InvestigationList investigations={investigations} area={null} />}>
          <InvestigationBrowser investigations={investigations} />
        </Suspense>
      </section>
    </div>
  );
}
