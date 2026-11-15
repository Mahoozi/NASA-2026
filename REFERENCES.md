# References

## NASA data
- NASA Physical Sciences Informatics (PSI), the 24 investigations in the Combustion Science research area. Fetched 2026-11-14 from the [PSI search API](https://psi.nasa.gov/geode-py/ws/repo/search) (raw snapshot: `data/raw/psi-combustion-investigations-2026-11-14.json`). Investigation pages used, one per investigation:
  - PSI-10 (ACME/Flame Design): [Advanced Combustion via Microgravity Experiments / Flame Design](https://psi.nasa.gov/physci/repo/data/investigations/PSI-10)
  - PSI-20 (ACME BRE): [Advanced Combustion via Microgravity Experiments - Burning Rate Emulator](https://psi.nasa.gov/physci/repo/data/investigations/PSI-20)
  - PSI-21 (ACME CLD Flame): [Advanced Combustion via Microgravity Experiments / Coflow Laminar Diffusion Flame](https://psi.nasa.gov/physci/repo/data/investigations/PSI-21)
  - PSI-22 (ACME E-FIELD Flames): [Advanced Combustion via Microgravity Experiments Electric-Field Effects on Laminar Diffusion Flames](https://psi.nasa.gov/physci/repo/data/investigations/PSI-22)
  - PSI-23 (ACME s-Flame): [Advanced Combustion via Microgravity Experiments-Structure and Response of Spherical Diffusion Flames](https://psi.nasa.gov/physci/repo/data/investigations/PSI-23)
  - PSI-25 (BASS-II): [Burning and Suppression of Solids - II](https://psi.nasa.gov/physci/repo/data/investigations/PSI-25)
  - PSI-26 (BASS): [Burning and Suppression of Solids](https://psi.nasa.gov/physci/repo/data/investigations/PSI-26)
  - PSI-39 (CFI): [Cool Flames Investigation](https://psi.nasa.gov/physci/repo/data/investigations/PSI-39)
  - PSI-47 (DAFT / DAFT-2): [Dust and Aerosol Measurement Feasibility Test / Dust and Aerosol Measurement Feasibility Test-2](https://psi.nasa.gov/physci/repo/data/investigations/PSI-47)
  - PSI-60: [Computational and Experimental Analysis of SPICE Data Sets](https://psi.nasa.gov/physci/repo/data/investigations/PSI-60)
  - PSI-62: [Concurrent Flame Spread Modeling using Flamelet Generated Manifolds in Microgravity with Comparison to BASS Experiments using Two-Color Tomography](https://psi.nasa.gov/physci/repo/data/investigations/PSI-62)
  - PSI-68 (FLEX-2): [Flame Extinguishment Experiment - 2](https://psi.nasa.gov/physci/repo/data/investigations/PSI-68)
  - PSI-69 (FLEX): [Flame Extinguishment Experiment](https://psi.nasa.gov/physci/repo/data/investigations/PSI-69)
  - PSI-98 (SAFFIRE-I): [Spacecraft Fire Safety Experiment-I](https://psi.nasa.gov/physci/repo/data/investigations/PSI-98)
  - PSI-99 (SAFFIRE-II): [Spacecraft Fire Experiment-II](https://psi.nasa.gov/physci/repo/data/investigations/PSI-99)
  - PSI-100 (SAFFIRE-III): [Spacecraft Fire Experiment-III](https://psi.nasa.gov/physci/repo/data/investigations/PSI-100)
  - PSI-101 (SAME-R): [Smoke Aerosol Measurement Experiment-Reflight](https://psi.nasa.gov/physci/repo/data/investigations/PSI-101)
  - PSI-102 (SAME): [Smoke and Aerosol Measurement Experiment](https://psi.nasa.gov/physci/repo/data/investigations/PSI-102)
  - PSI-106 (SLICE): [Structure and Liftoff In Combustion Experiment](https://psi.nasa.gov/physci/repo/data/investigations/PSI-106)
  - PSI-107 (SPICE): [Smoke Point In Co-flow Experiment](https://psi.nasa.gov/physci/repo/data/investigations/PSI-107)
  - PSI-115: [Utilization of the Smoke Aerosol Measurement Experiment Data for Advanced Modeling and Simulation of Smoke Generation in Micro-Gravity](https://psi.nasa.gov/physci/repo/data/investigations/PSI-115)
  - PSI-117: [Effect of External Thermo-Convective Perturbation on Cool Flame Dynamics: A Multidimensional Multi-Physics CFD Analysis](https://psi.nasa.gov/physci/repo/data/investigations/PSI-117)
  - PSI-142: [Quantitative Studies of Cool Flame Transitions at Radiation / Stretch Extinction Using Counterflow Flames](https://psi.nasa.gov/physci/repo/data/investigations/PSI-142)
  - PSI-159 (ACME CFI-G): [Advanced Combustion via Microgravity Experiments / Cool Flames Investigation with Gases](https://psi.nasa.gov/physci/repo/data/investigations/PSI-159)

## NASA documents
- [A Researcher’s Guide to: Combustion Science](https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/), published by the NASA International Space Station (ISS) Program Science Office:
  - PDF: [np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf](https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf), 1,500,825 bytes, sha256 `5fe046efe4e35e506023e27a9784d041e893026f19c9987591483614aea5d6b6`
  - Page text, extracted unedited: `data/guide-pages.json`
  - Corpus docs: `guide-p<page>`, one per PDF page

## NASA web pages
Saved unmodified on 2026-11-14 as `data/raw/nasa-web-<slug>-2026-11-14.html`; sizes and sha256 hashes are in the [corpus report](pipeline/corpus_report.md). Pages used:
- [Combustion Science](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/) (NASA Glenn Research Center), corpus doc `nasa-web-glenn-combustion-science`
- [55 Years Ago: The Apollo 1 Fire and its Aftermath](https://www.nasa.gov/history/55-years-ago-the-apollo-1-fire-and-its-aftermath/), corpus doc `nasa-web-apollo-1`
- [Apollo 13: Mission Details](https://www.nasa.gov/missions/apollo/apollo-13-mission-details/), corpus doc `nasa-web-apollo-13`
- [25 Years Ago: Fire Aboard Space Station Mir](https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/), corpus doc `nasa-web-mir-fire`

## NASA Spinoff pages (Earth applications page)
- [Fire Detector](https://spinoff.nasa.gov/node/9407), NASA Spinoff
- [Fireman's Air Tanks](https://spinoff.nasa.gov/node/9582), NASA Spinoff
- [New Technology for the Fire Attire](https://spinoff.nasa.gov/node/9918), NASA Spinoff

These are linked from /earth and labelled "NASA Spinoff (not PSI data)". They were provided in the challenge resources; Firebreak makes no claim that a specific PSI test led to any of them.

## Sources used in Scenario Lab

The first six sources supply the nine published findings. The Saffire sources also support the [source-discrepancy audit](pipeline/source_discrepancies.md). Recorded limits come from the PSI-25 table listed above; the [limits report](pipeline/limits_report.md) records each inclusion and exclusion. Import mappings: [BASS-II](pipeline/psi_bass2_columns.md), [BASS](pipeline/psi_bass_columns.md), [Saffire](pipeline/psi_saffire_columns.md).

| Source | Use in A's features |
|---|---|
| [Combustion of Solids in Microgravity: Results from the BASS-II Experiment](https://ntrs.nasa.gov/citations/20160000593), NTRS 20160000593 | PMMA rod results (p. 18) and BASS-II hypothesis (p. 6) |
| [Concurrent Flame Growth, Spread and Extinction over Composite Fabric Samples in Low Speed Purely Forced Flow in Microgravity](https://ntrs.nasa.gov/citations/20150008962), NTRS 20150008962 | Fabric quenching finding (p. 1) |
| [Results of Large-Scale Spacecraft Flammability Tests](https://ntrs.nasa.gov/citations/20170008805), NTRS 20170008805 | Saffire flame-length finding (p. 21); dimensions audit (abstract) |
| [Saffire: A Novel Approach to Study of Spacecraft Fire Safety Using Un-Manned Spacecraft](https://ntrs.nasa.gov/citations/20180005168), NTRS 20180005168 | Steady flame-spread finding (p. 18); audit comparisons (pp. 16, 30) |
| [Flammability of Materials on the Moon](https://ntrs.nasa.gov/citations/20240015307), NTRS 20240015307 | Prospective FM2 finding and partial-gravity caveat; poster reports laboratory/simulated-gravity evidence, no completed lunar-surface results |
| [Impacts of Reduced Pressure Atmospheres on Environmental Control and Life Support Systems (ECLSS) Architectures](https://ntrs.nasa.gov/api/citations/20260003925/downloads/20260003925.pdf), NTRS 20260003925 | Atmosphere findings (PDF p. 13) |
| [Topical: Solid Fuel Combustion in Partial and Micro-Gravity](https://ntrs.nasa.gov/api/citations/20210022402/downloads/217-_GollnerMichaelJ.pdf), NTRS 20210022402 | Gollner et al., university-led white paper; short external quote in the bounds caveat (PDF p. 3), not imported into the corpus |
| [Open Atmospheres Forum: Exploration Atmospheres Validation Study](https://ntrs.nasa.gov/api/citations/20220011152/downloads/Exploration%20Atmosphers%20OAF%2020220805.pdf), NTRS 20220011152 | Exploration Atmosphere preset: 8.2 psi / 34% O2 (p. 10); preset leaves gravity unset |

## Linked from the landing page
Cited on the home page ("Why it matters"), not part of the corpus:
- [Apollo 1](https://sma.nasa.gov/sma-disciplines/accllp/apollo-1) (NASA Office of Safety and Mission Assurance)
- [Apollo 13](https://sma.nasa.gov/sma-disciplines/accllp/apollo-13) (NASA Office of Safety and Mission Assurance)
- Mir: the "25 Years Ago: Fire Aboard Space Station Mir" page listed under NASA web pages above

## Challenge
- [Flame in Freefall](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/), 2026 NASA Space Apps Challenge

## Libraries
- Next.js 16.4.6
- React 19.3.0
- TypeScript 5.9.3
- Tailwind CSS 4.3.3
- shadcn/ui (components generated with shadcn 4.23.0; built on Base UI 1.9.0)
- lucide-react 1.73.0
- class-variance-authority 0.7.1, clsx 2.1.1, tailwind-merge 3.7.0
- Recharts 3.10.1
- Vercel AI SDK (ai) 7.0.173
- @ai-sdk/openai 4.0.118
- Zod 4.6.7
- MiniSearch 7.2.0
- unpdf 2.1.0 (PDF text extraction in [pipeline/corpus_extract_guide.ts](pipeline/corpus_extract_guide.ts))
- node-html-parser 9.0.6 (article text extraction from NASA web pages in [pipeline/corpus_build.ts](pipeline/corpus_build.ts))
- ESLint 9.39.5

## Images

- [PMMA rod demo](docs/screenshots/lab-demo.png) and [Moon Base](docs/screenshots/lab-moon-base.png): screenshots of Firebreak's deployed Scenario Lab, captured on 2026-11-14 with headless Chrome at 1440 × 1900. Exact scenario links are in the [README](README.md#screenshots); no NASA photographs are included in these screenshots.
