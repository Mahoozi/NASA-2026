# Eval notes — B3b.3, golden set for the expanded corpus

- Date: 2026-11-14 (run `generatedAt` 2026-11-15T03:16:58Z)
- Model: `gpt-5.4-mini`
- Corpus: 329 docs — psi 120, guide 55, nasa-web 4, ntrs 150
- Golden set: 28 items (24 old + 4 new). The 4 new items were committed in `13c939f`
  before any eval run. No prompt changes; no old golden item changed.

## Totals

| | Before (24 items, pre-NTRS run) | After (28 items) |
|---|---|---|
| Expected status | 24 of 24 | 27 of 28 |
| Answerable questions answered | 18 of 18 | 21 of 21 |
| Refusals correct | 6 of 6 | 6 of 7 |
| Wrongly refused | 0 | 0 |
| Every expected source retrieved | 17 of 18 | 18 of 21 |
| Citations verified | 64 of 64 | 90 of 90 |
| Verified citations pointing to an expected source | 55 of 64 | 48 of 90 |

The drop in citations pointing to an expected source comes from answers that now also cite
NTRS paper pages that are not listed in `expectDocIds`. Every citation still verifies.

## New items

| id | question | expectStatus | expectDocIds | result |
|---|---|---|---|---|
| `paper-sibal-quenching-speed` | In the BASS and BASS-II concurrent-flow tests on SIBAL cotton-fiberglass fabric, at what flow speeds did quenching extinction occur, and how did the quenching speed change with oxygen concentration? | answered | `ntrs-20150008962-p1`, `ntrs-20150008962-p7` | answered, sources retrieved |
| `paper-saffire2-silicone-flame` | What happened to the flame on the Saffire-II silicone samples after the igniter was powered off, and why was that surprising? | answered | `ntrs-20170008805-p12` | answered, source retrieved |
| `paper-bass2-pmma-rod-diameter` | In the BASS-II Material Ignition and Suppression Test on PMMA rods, how did flame spread rate change with sample diameter, and how did the normal-gravity spread rates compare with the microgravity ones? | answered | `ntrs-20160000593-p15` | answered, source retrieved |
| `none-saffire4-6-results` | What fire growth measurements did Saffire-IV, V and VI report for high-oxygen, low-pressure atmospheres? | insufficient_evidence | — | **answered (known failure)** |

Source text the answerable items were written from:

- `ntrs-20150008962-p7`: "Quenching flow velocities were found to be between 1 and 5 cm/s with higher velocity at lower oxygen percentage."
- `ntrs-20170008805-p12`: "When the igniter was powered off, a tiny gas phase flame remained but did not spread and quickly extinguished." and "It was surprising that not even the thin sample could permit any flame spread, given that it was entirely consumed in normal gravity."
- `ntrs-20160000593-p15`: "There is a downward trend in flame spread rate as sample diameter increases for both the 1g and μg (microgravity) tests. 1g tests have higher flame spread rates than μg."

## Known failure

**`none-saffire4-6-results`: answered when it should have been refused.** The only Saffire-IV–VI
text in the corpus is a concept slide, `ntrs-20180005168-p19`: "Saffire-IV, V, and VI Concept
Objectives: ♦ Demonstrate spacecraft fire monitoring and cleanup technologies in a realistic
spacecraft fire scenario ♦ Characterize fire growth in high O2, low pressure atmospheres". It
states objectives, not results. The model quoted those objectives and the planned sensors
(plus `psi-98-earth-benefits`, `psi-99-earth-benefits`) and did not say that no measurements
were reported. The citations verify, but the answer does not answer the question. Recorded
as is: the golden item and `app/api/ask` are unchanged.

## Retrieval shifts (old items, expectations unchanged)

Both items are still answered correctly, and every citation verifies. The expected sources are
still scientifically right. Near-duplicate pages of the BASS-II paper (Ferkul et al. 2014,
NTRS 20160000593) now rank above them in retrieval.

- **`demo-pmma-rod-low-flow`**: `psi-25-objectives` and `psi-25-approach` are no longer
  retrieved. The answer cites `ntrs-20160000593-p2`, which repeats the PSI objectives text:
  "The primary variables include: • Forced flow velocity (speed and direction) • Ambient oxygen
  concentration (via working volume nitrogen vitiation) • Sample geometry (rods, spherical
  section, slabs, films, and fabric sheets)". This is the demo question.
- **`fact-bass2-hypothesis`**: `guide-p21` is no longer retrieved. The answer cites
  `psi-25-hypothesis` (expected) plus `ntrs-20160000593-p6`: "Materials in microgravity, with
  adequate ventilation, may burn more readily compared to normal gravity with other conditions
  being identical (pressure, oxygen concentration, temperature, etc.)".

## Old refusal items checked against the papers

All six are still refused. None of the new pages answers them, so their expectations stand.

- `none-lunar-flame-spread`: the FM2 poster (`ntrs-20240015307-p1`) describes hardware that
  "will be sent to the Lunar surface" and laboratory tests; it gives no lunar-gravity PMMA
  spread rate.
- `none-martian-gravity`: the only "Martian" text (`ntrs-20260003925-p33`) is about
  atmosphere limits: "the maximum O2 concentration has not been defined for all habitable
  Exploration elements that will operate on the lunar or Martian surface". No spread rates.
- `none-polycarbonate`: the ECLSS report rates hardware for exploration atmospheres, for
  example `ntrs-20260003925-p63`: "The polycarbonate display window will be acceptable for
  flammability in Exploration atmospheres to 30% O2 at 10.2 psia". That is not microgravity flame
  spread data.
- `none-lithium-battery`: the only "lithium" text (`ntrs-20260003925-p49`) is "A granular
  lithium hydroxide (LiOH) bed". No battery fire data.
- `none-risk-rating-moon-base`, `none-safety-verdict-velcro`: refused by design (no ratings or
  safety verdicts).

## Real regressions

None. No answerable question was refused, and no citation failed verification. The
known failure above comes from a new item, so it is not a regression.
