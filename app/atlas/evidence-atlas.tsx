// Person A — "What NASA has burned, by atmosphere and material". A server component:
// the grid is in the static HTML, so nothing shifts when the page hydrates. Neutral
// colours only; a covered cell is filled, a gap is hatched. From the lg breakpoint
// the table fits its container; below it the table keeps its width and scrolls
// sideways inside its own box, with the row labels sticky.
import Link from "next/link";
import type { Investigation, Run } from "../../lib/schema";
import {
  ATLAS_BOTTOM_LABEL,
  ATLAS_FOOTNOTE,
  ATLAS_LEGEND,
  ATLAS_O2_COLUMN,
  atlasSentence,
  buildAtlas,
  cellParts,
  columnGroups,
  hasSubHeaders,
  headerRows,
} from "./atlas";

const FILLED = "border border-foreground/40 bg-foreground/15 hover:bg-foreground/25";
const HATCHED =
  "border border-dashed border-foreground/40 bg-[repeating-linear-gradient(135deg,transparent_0_6px,color-mix(in_oklab,var(--foreground)_22%,transparent)_6px_7px)] hover:bg-foreground/10";
const STICKY = "sticky left-0 z-10 bg-background";

export function EvidenceAtlas({ runs, investigations }: { runs: Run[]; investigations: Investigation[] }) {
  const atlas = buildAtlas(runs, investigations);
  const groups = columnGroups(atlas.columns);
  const depth = headerRows(groups);
  return (
    <section aria-labelledby="atlas-heading" className="flex scroll-mt-4 sm:scroll-mt-20 flex-col gap-3">
      <h2 id="atlas-heading" className="text-xl font-bold">
        What NASA has burned, by atmosphere and material
      </h2>
      <p className="text-sm text-muted-foreground">{ATLAS_LEGEND}</p>

      <div
        className="relative max-w-full overflow-x-auto rounded-lg border bg-card/60 backdrop-blur-sm"
        tabIndex={0}
        role="region"
        aria-label="Evidence gap atlas grid, scrolls sideways on narrow screens"
      >
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm lg:w-full lg:table-fixed">
          {/* From lg the label and oxygen columns get fixed shares; the material columns split the rest. */}
          <colgroup>
            <col className="lg:w-[14%]" />
            {atlas.columns.map((c) => (
              <col key={c.family} />
            ))}
            <col className="lg:w-[11%]" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" rowSpan={depth} className={`${STICKY} min-w-28 border-b px-2 py-2 text-left align-bottom font-semibold`}>
                Atmosphere
              </th>
              {groups.map((g) =>
                g.subLabels ? (
                  <th key={g.label} scope="colgroup" colSpan={g.columns.length} className="border-b px-1 pt-2 pb-1 text-center font-semibold">
                    {g.label}
                  </th>
                ) : (
                  <th key={g.label} scope="col" rowSpan={depth} className="min-w-24 border-b px-1.5 py-2 text-left align-bottom font-semibold">
                    {g.label}
                  </th>
                ),
              )}
              <th scope="col" rowSpan={depth} className="min-w-24 border-b px-2 py-2 text-left align-bottom font-semibold">
                {ATLAS_O2_COLUMN}
              </th>
            </tr>
            {hasSubHeaders(groups) && (
              <tr>
                {groups.flatMap((g) =>
                  (g.subLabels ?? []).map((sub) => (
                    <th key={`${g.label}-${sub}`} scope="col" className="min-w-24 border-b px-1.5 pb-2 text-left font-semibold">
                      {sub}
                    </th>
                  )),
                )}
              </tr>
            )}
          </thead>
          <tbody>
            {atlas.rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className={`${STICKY} min-w-28 border-b px-2 py-2 text-left align-top font-medium`}>
                  {r.label}
                  <span className="block font-normal text-muted-foreground">{r.summary}</span>
                </th>
                {r.cells.map((c) => {
                  const { big, small } = cellParts(c.n);
                  return (
                    <td key={c.family} className="border-b p-0.5 align-top">
                      <Link
                        href={c.href}
                        className={`flex h-full min-h-16 flex-col items-start rounded-md px-1 py-1 ${c.n > 0 ? FILLED : HATCHED}`}
                      >
                        <span className="sr-only">
                          {r.label}, {c.family}:{" "}
                        </span>
                        <span className="text-xl leading-tight font-semibold">{big}</span>{" "}
                        <span className="leading-tight">{small}</span>
                      </Link>
                    </td>
                  );
                })}
                <td className="border-b px-2 py-2 align-top font-medium">{r.o2Vs.text}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className={`${STICKY} min-w-28 px-2 py-2 text-left align-top font-medium`}>
                {ATLAS_BOTTOM_LABEL}
              </th>
              {atlas.columns.map((c) => (
                <td key={c.family} className="px-1.5 py-2 align-top font-medium">
                  {c.highestO2}%
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="max-w-3xl text-base">{atlasSentence(atlas)}</p>
      <p className="max-w-3xl text-sm text-muted-foreground">{ATLAS_FOOTNOTE}</p>
    </section>
  );
}
