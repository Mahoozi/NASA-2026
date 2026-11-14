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
- unpdf 2.1.0 (PDF text extraction in `pipeline/corpus_extract_guide.ts`)
- ESLint 9.39.5

## Images

## AI tools
- Claude Code (code assistance)
