// Person A — frames Saffire-II's microgravity and 1-g burn lengths as bounds.
// Source: NASA Space Apps 2026 challenge brief, Flame in Freefall: "Microgravity
// and normal-gravity results could bound what occurs at intermediate gravity
// levels." Saffire-II (PSI-99) is the only imported table with 1-g results.
import { CHALLENGE_BRIEF_URL } from "./higher-oxygen-note";

/** Anchor of the Space vs Earth (Saffire-II) section in lab-client.tsx. */
export const SPACE_VS_EARTH_ID = "space-vs-earth";

export function GravityBoundsNote({
  linkToPanel = false,
  className,
}: {
  /** Add a link to the Space vs Earth panel (used in the gaps panel). */
  linkToPanel?: boolean;
  className?: string;
}) {
  return (
    <p className={className}>
      The{" "}
      <a
        href={CHALLENGE_BRIEF_URL}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-4 hover:text-foreground"
      >
        challenge brief<span className="sr-only"> (opens in a new tab)</span>
      </a>{" "}
      notes that microgravity and normal-gravity results could bound what happens at
      intermediate (lunar or Martian) gravity. Saffire-II is the only imported investigation
      with both, side by side.
      {linkToPanel && (
        <>
          {" "}
          <a
            href={`#${SPACE_VS_EARTH_ID}`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            See Space vs Earth (Saffire-II)
          </a>
          .
        </>
      )}
    </p>
  );
}
