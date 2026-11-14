// Person B — /ask. The client part reads ?scenario= and ?investigations= (Lab handoff).
import { Suspense } from "react";
import investigationsJson from "@/data/investigations.json";
import type { Investigation } from "@/lib/schema";
import { AskClient } from "./ask-client";

export default function AskPage() {
  const acronyms = Object.fromEntries(
    (investigationsJson as Investigation[]).map((i) => [i.id, i.acronym]),
  );
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Ask the evidence</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Ask about NASA&apos;s microgravity combustion investigations. Every sentence in an answer
          comes with a quote from a NASA source. If the sources don&apos;t cover your question, the
          answer says so.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <AskClient acronyms={acronyms} />
      </Suspense>
    </div>
  );
}
