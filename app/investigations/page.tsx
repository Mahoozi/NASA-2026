// Person B
import { InvestigationList } from "./investigation-list";
import { investigations } from "./data";

export default function InvestigationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Investigations</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          The {investigations.length} combustion investigations in NASA&apos;s Physical Sciences
          Informatics (PSI) system. Each page shows the investigation&apos;s own PSI text and links
          back to the source.
        </p>
      </div>
      <InvestigationList investigations={investigations} />
    </div>
  );
}
