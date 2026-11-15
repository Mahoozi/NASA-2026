// Person A — the /watchlist page body. NASA's sentences are quoted verbatim (data-quoted);
// everything else is Firebreak's own wording or computed from the data files.
import Link from "next/link";
import type { CorpusDoc, Run } from "../../lib/schema";
import {
  atmospheresFrom,
  shownContext,
  WATCHLIST_FOOTNOTE,
  WATCHLIST_INTRO,
  WATCHLIST_TITLE,
  watchlistRows,
  watchlistSentence,
} from "./watchlist";
import type { WatchlistEntry } from "./types";

const linkClass = "underline underline-offset-4 hover:text-foreground";
// Below the md breakpoint (768 px) each row stacks and each cell shows its column name.
const cell =
  "block px-0 py-2 align-top before:mb-1 before:block before:text-sm before:font-semibold before:text-muted-foreground before:content-[attr(data-label)] md:table-cell md:px-3 md:before:hidden";

function Ntrs({ url, page, children }: { url: string; page: number; children?: React.ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className={linkClass}>
      {children ?? `p. ${page}`}
      <span className="sr-only"> (opens the NASA Technical Reports Server record in a new tab)</span>
    </a>
  );
}

export function WatchlistView({ entries, runs, corpus }: { entries: WatchlistEntry[]; runs: Run[]; corpus: CorpusDoc[] }) {
  const rows = watchlistRows(entries, runs, corpus);
  const context = shownContext(entries, corpus);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-2xl font-semibold text-balance">{WATCHLIST_TITLE}</h1>
        <p className="text-base text-pretty text-muted-foreground">{WATCHLIST_INTRO}</p>
      </div>

      <ul className="flex max-w-prose flex-col gap-4">
        {context.map(({ entry, recordUrl }) => (
          <li key={entry.id}>
            <figure className="flex flex-col gap-1">
              <blockquote data-quoted="nasa" className="border-l-2 pl-3 text-base leading-relaxed italic">
                “{entry.quote}”
              </blockquote>
              <figcaption className="text-sm text-muted-foreground">
                <Ntrs url={recordUrl} page={entry.page}>
                  NASA NESC report, p. {entry.page}
                </Ntrs>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <table className="w-full min-w-0 border-collapse text-sm">
        <thead className="hidden md:table-header-group">
          <tr className="border-b text-left">
            <th scope="col" className="w-[18%] px-3 py-2 font-semibold">Hardware</th>
            <th scope="col" className="w-[14%] px-3 py-2 font-semibold">Material, as NASA wrote it</th>
            <th scope="col" className="w-[38%] px-3 py-2 font-semibold">NASA&apos;s sentence</th>
            <th scope="col" className="px-3 py-2 font-semibold">PSI flight evidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.entry.id} data-entry={r.entry.id} className="block border-b py-3 md:table-row md:py-0">
              <td data-label="Hardware" className={cell}>
                <span className="font-medium">{r.entry.hardware}</span>
                {r.entry.subsystem && <span className="block text-muted-foreground">{r.entry.subsystem}</span>}
              </td>
              <td data-label="Material, as NASA wrote it" className={`${cell} break-words`}>
                <span data-quoted="material">{r.entry.materialAsWritten}</span>
              </td>
              <td data-label="NASA's sentence" className={cell}>
                <blockquote data-quoted="nasa" className="leading-relaxed italic">
                  “{r.entry.quote}”
                </blockquote>
                <span className="text-muted-foreground">
                  NASA NESC report, <Ntrs url={r.recordUrl} page={r.entry.page} />
                </span>
              </td>
              <td data-label="PSI flight evidence" className={`${cell} leading-relaxed`}>
                <span data-evidence={r.evidence.matchable ? (r.evidence.runs > 0 ? "runs" : "none") : "unmatched"}>
                  {r.evidenceText}
                </span>
                {r.labHref && (
                  <>
                    {" "}
                    <Link href={r.labHref} className={linkClass}>
                      Open in the Lab
                    </Link>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex max-w-3xl flex-col gap-2">
        <p className="text-base">{watchlistSentence(rows, atmospheresFrom(entries))}</p>
        <p className="text-sm text-muted-foreground">{WATCHLIST_FOOTNOTE}</p>
      </div>
    </div>
  );
}
