// Person A — frames Saffire-II's microgravity and 1-g burn lengths as bounds,
// with the published caveat that partial gravity may fall outside them.
// Source: NASA Space Apps 2026 challenge brief, Flame in Freefall: "Microgravity
// and normal-gravity results could bound what occurs at intermediate gravity
// levels." Saffire-II (PSI-99) is the only imported table with 1-g results.
import { CHALLENGE_BRIEF_URL } from "./higher-oxygen-note";

/** Anchor of the Space vs Earth (Saffire-II) section in lab-client.tsx. */
export const SPACE_VS_EARTH_ID = "space-vs-earth";

/**
 * Verbatim quotes, fetched 2026-11-14 from the URLs below. Change them only by
 * re-fetching the source; never paraphrase inside the quote marks.
 */
export const PARTIAL_GRAVITY_SOURCES = {
  gollner: {
    ntrs: "20210022402",
    label: "Gollner et al., 2021 white paper",
    url: "https://ntrs.nasa.gov/api/citations/20210022402/downloads/217-_GollnerMichaelJ.pdf",
    quote:
      "a “sweet spot” for expanded flammability regimes with enhanced propensity for flame spread close to Lunar gravity conditions",
  },
  fm2: {
    ntrs: "20240015307",
    label: "Zayac et al. 2024, FM2 poster",
    url: "https://ntrs.nasa.gov/citations/20240015307",
    quote:
      "Lunar gravity has been found to increase the limits of flammability for some materials compared to Earth gravity",
  },
} as const;

/** A quote inside our quote marks: its own double quotes become single ones. */
export const nested = (quote: string) => quote.replace(/“/g, "‘").replace(/”/g, "’").replace(/"/g, "'");

const linkClass = "underline underline-offset-4 hover:text-foreground";

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function GravityBoundsNote({
  linkToPanel = false,
  className,
}: {
  /** Add a link to the Space vs Earth panel (used in the gaps panel). */
  linkToPanel?: boolean;
  className?: string;
}) {
  const { gollner, fm2 } = PARTIAL_GRAVITY_SOURCES;
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <p>
        The <Ext href={CHALLENGE_BRIEF_URL}>challenge brief</Ext> notes that microgravity and
        normal-gravity results could bound what happens at intermediate (lunar or Martian)
        gravity. Saffire-II is the only imported investigation with both, side by side.
        {linkToPanel && (
          <>
            {" "}
            <a href={`#${SPACE_VS_EARTH_ID}`} className={linkClass}>
              See Space vs Earth (Saffire-II)
            </a>
            .
          </>
        )}
      </p>
      <p>
        Caveat: published tests suggest flammability may peak near lunar gravity.{" "}
        <Ext href={gollner.url}>Gollner et al.</Ext> (2021 white paper, NTRS {gollner.ntrs})
        report “{nested(gollner.quote)}”, and the <Ext href={fm2.url}>FM2 team</Ext> (NTRS{" "}
        {fm2.ntrs}) writes that “{nested(fm2.quote)}”. If so, microgravity and normal-gravity results may not bound lunar
        gravity. FM2, a combustion chamber to be sent to the surface of the Moon, and LUCI are
        the experiments the challenge brief expects to add partial-gravity data.
      </p>
    </div>
  );
}
