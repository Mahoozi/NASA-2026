// Person A — "Claim checks" table for /evals. Rows come from claims.ts, recomputed
// when the page is built or rendered; a mismatch is shown as plainly as a match.
import type { ClaimResult } from "./claims";

function formatTime(iso: string): string {
  return (
    new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(
      new Date(iso),
    ) + " UTC"
  );
}

export function ClaimChecks({ results, checkedAt }: { results: ClaimResult[]; checkedAt: string }) {
  const failing = results.filter((r) => !r.matches).length;
  return (
    <section aria-labelledby="claim-checks" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="claim-checks" className="text-xl font-bold">
          Claim checks
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          These are the numbers we state in the pitch and on the site, checked against the files in
          data/. {failing === 0 ? `All ${results.length} match.` : `${failing} of ${results.length} do not match.`}
        </p>
        <p className="max-w-prose text-sm text-muted-foreground">
          Checked at build: <time dateTime={checkedAt}>{formatTime(checkedAt)}</time>.
        </p>
      </div>
      <table className="w-full min-w-0 border-collapse text-sm">
        <thead className="hidden sm:table-header-group">
          <tr className="border-b text-left">
            <th scope="col" className="w-[45%] px-3 py-2 font-semibold">Claim</th>
            <th scope="col" className="px-3 py-2 font-semibold">Expected</th>
            <th scope="col" className="px-3 py-2 font-semibold">Actual</th>
            <th scope="col" className="px-3 py-2 font-semibold">Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id} className="block border-b py-3 sm:table-row sm:py-0" data-claim={r.id} data-matches={r.matches}>
              <td data-label="Claim" className="block px-0 py-2 align-top break-words before:mb-1 before:block before:text-sm before:font-semibold before:text-muted-foreground before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:before:hidden">{r.claim}</td>
              <td data-label="Expected" className="block px-0 py-2 align-top break-words before:mb-1 before:block before:text-sm before:font-semibold before:text-muted-foreground before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:before:hidden tabular-nums">{r.expected}</td>
              <td data-label="Actual" className="block px-0 py-2 align-top break-words before:mb-1 before:block before:text-sm before:font-semibold before:text-muted-foreground before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:before:hidden tabular-nums">{r.actual}</td>
              <td data-label="Result" className={r.matches ? "block px-0 py-2 align-top break-words before:mb-1 before:block before:text-sm before:font-semibold before:text-muted-foreground before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:before:hidden" : "block px-0 py-2 align-top break-words before:mb-1 before:block before:text-sm before:font-semibold before:text-muted-foreground before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:before:hidden font-semibold underline"}>
                {r.matches ? "matches" : "does not match"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="max-w-prose text-sm text-muted-foreground">
        That the imported PSI values match a fresh import from the raw tables is checked in the test
        suite (claims.test.ts), not on this page.
      </p>
    </section>
  );
}
