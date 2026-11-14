// Person B
import { Suspense } from "react";
import { InvestigationBrowser, InvestigationList } from "./investigation-list";
import { investigations } from "./data";

export default function InvestigationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">Investigations</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          The {investigations.length} combustion investigations in NASA’s Physical Sciences
          Informatics (PSI) system. Each page shows the investigation’s own PSI text and links back
          to the source.
        </p>
      </div>
      {/* The fallback is the unfiltered list, so the static HTML has every card. */}
      <Suspense fallback={<InvestigationList investigations={investigations} area={null} />}>
        <InvestigationBrowser investigations={investigations} />
      </Suspense>
    </div>
  );
}
