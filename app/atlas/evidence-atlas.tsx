// Person A — "What NASA has burned, by atmosphere and material". A server component:
// the grid is in the static HTML, so nothing shifts when the page hydrates. Neutral
// colours only; a covered cell is filled, a gap is hatched.
import Link from "next/link";
import type { Investigation, Run } from "../../lib/schema";
import { ATLAS_FOOTNOTE, ATLAS_LEGEND, atlasSentence, buildAtlas, cellText } from "./atlas";

const FILLED = "border border-foreground/40 bg-foreground/15 hover:bg-foreground/25";
const HATCHED =
  "border border-dashed border-foreground/40 bg-[repeating-linear-gradient(135deg,transparent_0_6px,color-mix(in_oklab,var(--foreground)_22%,transparent)_6px_7px)] hover:bg-foreground/10";

export function EvidenceAtlas({ runs, investigations }: { runs: Run[]; investigations: Investigation[] }) {
  const atlas = buildAtlas(runs, investigations);
  return (
    <section aria-labelledby="atlas-heading" className="flex scroll-mt-4 flex-col gap-3">
      <h2 id="atlas-heading" className="text-xl font-semibold">
        What NASA has burned, by atmosphere and material
      </h2>
      <p className="text-sm text-muted-foreground">{ATLAS_LEGEND}</p>

      <div className="relative max-w-full overflow-x-auto rounded-lg border" tabIndex={0} role="region" aria-label="Evidence gap atlas grid, scrolls sideways">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 border-b bg-background px-3 py-2 text-left font-semibold">
                Atmosphere
              </th>
              {atlas.columns.map((c) => (
                <th key={c.family} scope="col" className="min-w-36 border-b px-2 py-2 text-left font-semibold">
                  {c.family}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {atlas.rows.map((r) => (
              <tr key={r.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 min-w-44 border-b bg-background px-3 py-2 text-left align-top font-medium"
                >
                  {r.label}
                  <span className="block font-normal text-muted-foreground">{r.summary}</span>
                </th>
                {r.cells.map((c) => (
                  <td key={c.family} className="border-b p-1.5 align-top">
                    <Link
                      href={c.href}
                      className={`flex h-full min-h-16 flex-col gap-0.5 rounded-md px-2 py-1.5 ${c.n > 0 ? FILLED : HATCHED}`}
                    >
                      <span className="sr-only">
                        {r.label}, {c.family}:{" "}
                      </span>
                      <span className="font-medium">{cellText(c.n)}</span>
                      <span className="text-muted-foreground">highest tested O2: {c.highestO2}%</span>
                    </Link>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="max-w-3xl text-base">{atlasSentence(atlas)}</p>
      <p className="max-w-3xl text-sm text-muted-foreground">{ATLAS_FOOTNOTE}</p>
    </section>
  );
}
