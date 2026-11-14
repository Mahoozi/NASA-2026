// Person A — scopes the "highest starting oxygen" claim to solid materials.
// Source: NASA Space Apps 2026 challenge brief, Flame in Freefall: "Microgravity
// tests with the highest oxygen concentrations were conducted as part of the
// ACME's Cool Flames Investigation with Gases (CFI-G) ... an oxygen-nitrogen
// mixture of up to 85% oxygen flowed from the spherical burner".
export const CHALLENGE_BRIEF_URL =
  "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/";
export const ACME_CFIG_MAX_O2_PCT = 85;

/** `maxSolidO2` is computed by the caller from data/runs.json. */
export function HigherOxygenNote({ maxSolidO2, className }: { maxSolidO2: number; className?: string }) {
  return (
    <p className={className}>
      Higher-oxygen microgravity tests exist: ACME CFI-G flowed up to {ACME_CFIG_MAX_O2_PCT}%
      oxygen through a gaseous-fuel burner (
      <a
        href={CHALLENGE_BRIEF_URL}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-4 hover:text-foreground"
      >
        challenge brief<span className="sr-only"> (opens in a new tab)</span>
      </a>
      ). None of the imported solid-material runs with a recorded starting oxygen started above{" "}
      {maxSolidO2}%.
    </p>
  );
}
