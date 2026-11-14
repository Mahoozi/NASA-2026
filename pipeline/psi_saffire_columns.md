# Saffire experimental tables (PSI-98, PSI-99, PSI-100): columns and derivations

Sources (never edited; each found by its PSI id):

| PSI | Experiment | File | Page |
|---|---|---|---|
| PSI-98 | Saffire-I | `data/raw/PSI-98_Experimental table_SAFFIRE-1.csv` | https://psi.nasa.gov/physci/repo/data/investigations/PSI-98 |
| PSI-99 | Saffire-II | `data/raw/PSI-99_Experimental table_SAFFIRE-2.csv` | https://psi.nasa.gov/physci/repo/data/investigations/PSI-99 |
| PSI-100 | Saffire-III | `data/raw/PSI-100_Experimental table_SAFFIRE-3.csv` | https://psi.nasa.gov/physci/repo/data/investigations/PSI-100 |

Importer: `pipeline/psi_import_saffire.ts` (one script, three files), combined into `data/runs.json` by `npm run import:psi`. Each file's headers are mapped explicitly after collapsing whitespace, and an unknown header stops the import.

## Rows

| PSI | Data rows | Runs | Skipped |
|---|---|---|---|
| PSI-98 | 4 | 2 (S1, S2) | `F1C1/F1C2`, `F2C1/F2C2`: pre-test flow visualisation, not burns |
| PSI-99 | 15 | 9 (2-1 … 2-9) | `F1C1/F1C2`, `F2C1/F2C2` (flow visualisation); `Note 1`–`Note 4` (text below) |
| PSI-100 | 2 | 2 (S1, S2) | none |

**Not in these tables:** date, PI, CO2, CO, outcome events. `date` and `pi` are "not stated in table". CO2 and CO are `null` with `co.raw` empty. `events` is always empty: Saffire outcomes are in the observations, never turned into events.

## Headers as written

| Key | PSI-98 | PSI-99 | PSI-100 | Used for |
|---|---|---|---|---|
| sample | Sample Number | Sample Number | Sample Number | `id` = `PSI-xx:<sample>`, `testId` |
| material | Material | Material | Material | `material` |
| thickness | Sample Thickness (cm) | Samle Thickness *(sic)* | Sample Thickness | `material.thicknessMm` |
| length | Sample Length (cm) | Sample Length | Sample Length | observation "sample length" |
| width | Sample Width (cm) | Sample Width (cm) | Sample Width | `material.widthCm` |
| airflow | Air Flow (cm/s) | Air Flow (cm/s) | Air Flow | `flowCmS.min` = `max` |
| oxygen | Percent O2 | Percent O2 (Note 1) | — | `o2InitialPct`, `o2FinalPct` |
| direction | Flow Direction | Flow Direction | Direction | `flowDirection` |
| ignition power / time, burn time | (W), (s), (s) | (W), (s), (s) | — | observations |
| Saffire-II results | — | `?-g Burn Length`, `?-g Spread Length`, `1-g Burn Length`, `1-g Spread Rate` | — | observations |
| Camera 1, Camera 2 | yes | yes | yes | observations |

**The `?-g` headers:** the PSI-99 file contains a literal ASCII `?` (byte 0x3F) where the source meant microgravity (presumably "µg"). The character was lost before the file reached us; the whole file is plain ASCII. The importer matches the header as written and labels the columns "microgravity burn length" and "microgravity spread". The 1-g columns are labelled "1-g burn length" and "1-g spread rate".

## Derivations

- **Material**: the shared rules in `pipeline/psi_shared.ts` (see `psi_bass_columns.md`). "Cotton-Fiberglass (SIBAL)" and "SIBAL Fabric" → SIBAL fabric. Silicone and "PMMA & Nomex" → other. "PMMA" with no shape word → other + flag *PMMA, shape not stated*.
- **Blank material** (PSI-99 2-6 and 2-9): the family and text are taken from the row directly above, flagged *material blank in source; taken from the row above*. So 2-6 is SIBAL fabric (from 2-5) and 2-9 is "PMMA" → other (from 2-8). 2-9 is not read as a slab: its 1 cm thickness doesn't state a shape.
- **Oxygen**: `~ 21.5` → 21.5, flagged *oxygen approximate in source (raw: …)*. `22.1 to 22.0` → initial 22.1, final 22.0. `21.5 - 21.7` → initial 21.5, final `null`, flagged *oxygen given as a range in source (raw: …)*. PSI-100 has no oxygen column: `null`, flagged *oxygen not recorded in this table*. Per Note 1, Saffire-II oxygen was derived from CO2 production, not measured directly.
- **Thickness** (mm): `<n> mm` → n; `<n> cm` → n × 10; a bare number under a `(cm)` header → n × 10.
  - `037 mm` (PSI-99 2-4, 2-5, 2-6): a leading zero and no decimal point, so it could be 0.37 or 37. Left undefined, flagged *thickness ambiguous in source (raw: 037 mm)*.
  - `See Fig. 5` (2-8) and `0.85 and 0.37 mm` (2-7): left undefined, the text kept as observation "sample thickness".
  - PSI-98 states SIBAL at `0.37` cm, so 3.7 mm, flagged *thickness unit inconsistent between Saffire tables; not corrected*. The same fabric is written `037 mm` in Saffire-II and `.33 cm` in Saffire-III.
- **Width** from the width column. **Length** is an observation, verbatim; its label carries the header unit when the cell has none ("sample length (cm)").
- **Observations**: every other column, verbatim, with its header unit in the label when it has one. Blank cells are not recorded. A cell citing `(note N)` or `Note N`, and the oxygen header's `(Note 1)`, add `{ label: "source note N", value: <note text> }`.

## Saffire-II notes (PSI-99), verbatim

- **Note 1** Derived from measured CO2 production and referenced to initial O2 concentration reported by ISS.
- **Note 2** The PMMA portion was completely consumed but the Nomex was not ignited.
- **Note 3** This is the length of fuel with significant visible damage.
- **Note 4** The flames remain anchored at the base of the sample which has a very slow regression rate (0.01 to 0.04 mm/s)

## Kept as written, worth knowing

- 2-8's microgravity burn length cites note 3, but 2-9's identical-looking entry `~ 10 cm (note 4)` cites note 4.
- 2-6's camera 2 is written `S56C2`; 2-4 lists `S4C1` for both cameras.
- PSI-98 gives length 40.6 and width 94; PSI-100 gives length 94 cm and width 40.6 cm for the same SIBAL fabric. Values are taken as written.
