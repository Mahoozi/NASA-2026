// Person A
import type { GapReport } from "./gaps";

export function GapsPanel({ report }: { report: GapReport }) {
  return (
    <section id="gaps" aria-labelledby="gaps-heading" className="flex flex-col gap-3">
      <h3 id="gaps-heading" className="text-base font-semibold">
        Where the evidence runs out
      </h3>
      {report.gaps.length ? (
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
          {report.gaps.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Every dimension you set has at least one run or investigation within range.
        </p>
      )}
      {report.nearest.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-sm font-medium text-muted-foreground">Nearest evidence</h4>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            {report.nearest.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
