// Person A — How Firebreak answers the challenge. Three columns: the brief's own
// words, where Firebreak answers them, and a neutral description. Quoted text
// carries data-quoted; the refusal list carries data-exempt so tests can tell
// them from Firebreak's own wording.
import type { Metadata } from "next";
import Link from "next/link";
import { BRIEF_URL, displayBriefQuote, OUT_OF_SCOPE_QUOTE } from "./brief-text";
import { briefRows, loadBriefFacts } from "./rows";

export const metadata: Metadata = { title: "How Firebreak answers the challenge · Firebreak" };

export const REFUSALS = [
  "No fire-risk scores, safety ratings or predictions beyond tested conditions.",
  "Every oxygen claim is limited to solid-material runs with a recorded starting oxygen.",
  "Where a PSI table disagrees with a NASA paper, the table value is kept and the difference is flagged.",
];

const linkClass = "underline underline-offset-4 hover:text-foreground";
// Below the sm breakpoint each row stacks and each cell shows its column name.
const cell =
  "block px-0 py-2 align-top before:mb-1 before:block before:text-sm before:font-semibold before:text-muted-foreground before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:before:hidden";

export default function BriefPage() {
  const rows = briefRows(loadBriefFacts());
  return (
    <div className="flex flex-col gap-10">
      <div className="flex max-w-prose flex-col gap-2">
        <h1 className="text-3xl font-bold sm:text-4xl">How Firebreak answers the challenge</h1>
        <p className="text-base text-pretty text-muted-foreground">
          Each row takes words from the{" "}
          <a href={BRIEF_URL} target="_blank" rel="noreferrer" className={linkClass}>
            NASA Space Apps challenge brief
            <span className="sr-only"> (opens in a new tab)</span>
          </a>{" "}
          and points to where Firebreak addresses them.
        </p>
      </div>

      <table className="w-full min-w-0 border-collapse text-sm">
        <thead className="hidden sm:table-header-group">
          <tr className="border-b text-left">
            <th scope="col" className="w-[30%] px-3 py-2 font-semibold">
              The brief asks
            </th>
            <th scope="col" className="w-[28%] px-3 py-2 font-semibold">
              Where in Firebreak
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              What you&apos;ll see
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.quote} className="block border-b py-3 sm:table-row sm:py-0">
              <td data-label="The brief asks" className={cell}>
                <blockquote data-quoted="brief" className="border-l-2 pl-3 leading-relaxed break-words italic">
                  {displayBriefQuote(r.quote)}
                </blockquote>
              </td>
              <td data-label="Where in Firebreak" className={cell}>
                <ul className="flex flex-col gap-1">
                  {r.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href} className={linkClass}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </td>
              <td data-label="What you'll see" className={`${cell} leading-relaxed break-words`}>
                {r.seen}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section aria-labelledby="refuse-heading" className="flex max-w-prose flex-col gap-3">
        <h2 id="refuse-heading" className="text-xl font-semibold">
          What Firebreak refuses to do
        </h2>
        <ul data-exempt="refusals" className="flex list-disc flex-col gap-2 pl-5 text-base">
          {REFUSALS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="scope-heading" className="flex max-w-prose flex-col gap-3">
        <h2 id="scope-heading" className="text-xl font-semibold">
          Out of scope, per the brief:
        </h2>
        <blockquote data-quoted="brief" className="border-l-2 pl-3 text-base leading-relaxed italic">
          {displayBriefQuote(OUT_OF_SCOPE_QUOTE)}
        </blockquote>
      </section>
    </div>
  );
}
