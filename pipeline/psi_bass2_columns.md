# PSI-25 (BASS-II) experimental table: columns and derivations

Source: `data/raw/PSI-25_Experimental table_BASS-II.csv` (never edited).
Importer: `pipeline/psi_import_bass2.ts` (`npm run import:psi`), writes `data/runs.json` as `Run[]` (see `lib/schema.ts`).
Investigation page: https://psi.nasa.gov/physci/repo/data/investigations/PSI-25

The file has 129 data rows, one per test (or test segment, e.g. `O5a`/`O5b`).
Header names contain irregular runs of spaces and a trailing space. Columns are matched after collapsing whitespace and trimming.
The file starts with a UTF-8 byte-order mark, which is stripped.

## Columns

| Column (normalised) | Meaning | Used for |
|---|---|---|
| PI | Principal investigator surname | `pi` |
| Test # | Test label (PI initial + number, optional a/b segment) | `testId`, `id` = `PSI-25:<Test #>` |
| Date | Test date, `m/d/yyyy` | `date` (ISO `yyyy-mm-dd`) |
| GMT | Day of year (GMT) of the test | date checks only |
| Sample # | Sample identifier | not in schema, not carried |
| Fuel Sample Material | Free-text sample description | `material` |
| Flow restrictor | Restrictor setting (0/1/2) | not in schema, not carried |
| Fan display | Fan / potentiometer setting(s), free text | `flowCmS.raw`, events |
| Air display | Airflow speed in cm/s, free text | `flowCmS.min/max`, `flowCmS.raw`, events |
| Radiometer gain (1000 250 50 10) | Radiometer gain setting(s) | not in schema, not carried |
| Total Frames Shot | Frame count (sometimes text, e.g. `video`) | not in schema, not carried |
| Calibrated initial O2 % by vol | Initial O2 | `o2InitialPct` |
| Calibrated final O2 % by vol | Final O2 | `o2FinalPct` |
| Initial CO2 % by vol | Initial CO2 | `co2.initialPct` |
| Final CO2 % by vol | Final CO2 | `co2.finalPct` |
| Initial CO (ppm) | Initial CO | `co.initialPpm` |
| Final CO (ppm) | Final CO | `co.finalPpm` |

The four "not carried" columns have no field in the frozen `Run` schema. They are still in the raw file.

## Evidence for the two flow columns

- **Air display = airflow speed in cm/s.** Row O5b has Air display `49   5 cm/s`, so the cm/s unit sits in this column. Most values are 0–20, consistent with the tunnel's stated maximum of 40 cm/s.
- **Fan display = fan / potentiometer setting.** Row P5 has Fan display `Fan pot 1.5 (5cm/s)`, so the fan value is a pot setting and the airflow it produced is given in parentheses. Rows M17, M18, P9, P13a and P13b also start with "Fan pot".
- Both columns hold several values per test, because the crew stepped the flow during a test. Some rows mix the two quantities (pot settings written in the Air column, or values apparently entered in the wrong column). These cases are flagged, not corrected.
- There is no outcome column. Outcomes (extinction, blowoff, failure to ignite) appear only as words inside these two text columns.

## Field derivations

General rule: values are never dropped, corrected, averaged or filled in. A value that cannot be trusted is set to `null` and the row gets a flag naming the reason. Numeric cells accept a number, `none` or blank. Any other token makes the import fail, so a new kind of value cannot slip through silently.

### material
- `raw`: the cell with whitespace collapsed.
- `family` (case-insensitive, first match wins): `sibal` → SIBAL fabric; `nomex` → Nomex; `wax` → wax; `spherical` → other (flag *spherical sample: material not stated in table*); `rod` → PMMA rod; `film` or `micron` or thickness ≤ 0.5 mm → PMMA film; `slab` or `sided` or thickness ≥ 1 mm → PMMA slab; otherwise other.
- If the family is a PMMA type but the text does not say "PMMA", flag *material inferred as PMMA from sibling rows*.
- `thicknessMm`: `<n> micron` → n/1000, otherwise `<n> mm` / `<n>mm` → n.
- `widthCm`: first `<n> cm`. This also matches "4 cm spherical section" (T3, T7), where the 4 cm is likely the sample size rather than a width.
- `diameterIn`: `1/4` → 0.25, `3/8` → 0.375, `1/2` or `0.5` → 0.5.

### o2InitialPct / o2FinalPct
Numbers. `none`/blank → null. The final value is set to null, with flag *final O2 implausible in source (raw: …)*, if it is below 10, above 25, or more than 0.5 above the initial value.

### flowCmS
- `raw` = `fan: <Fan display> | air: <Air display>`, whitespace collapsed.
- `min`/`max` come from **Air display** only:
  1. If it contains `<n> cm/s`, min = max = n.
  2. Otherwise take the numbers outside parentheses. Drop a number immediately followed by the word `pot`, and every number after the word `pot` or `pots`. `<1` counts as 1 (flag *airflow below 1 cm/s at some point*). `~` and `?` are ignored.
  3. If the max is above 40 and every number inside parentheses is ≤ 40, use the parenthesised numbers instead (flag *fan and airflow values appear swapped in source*).
  4. If the max is still above 40, keep it (flag *airflow above the 40 cm/s tunnel maximum stated by PSI*).
  5. If Air display mentions `pot` anywhere, flag *airflow partly recorded as fan pot setting; minimum uncertain*.
  6. No usable numbers → null/null (flag *airflow not numeric in source*).

### events
Searched in Fan display + Air display, case-insensitive:
- `ext` anywhere, or the whole word `out` → extinction
- `blowoff` → blowoff
- `no ign` or `would not stay lit` → no-ignition

`ign` alone (ignited) and `off` are not events. No keyword gives an empty list, which means "not recorded", not "no event".

### co2
Numbers; `none`/blank → null.

### co
- `raw` = `<initial> → <final>` as written.
- `OR`, `over`, `>500` → null (flag *CO over range in source*). `none`/blank → null.
- Negative readings are kept (flag *negative CO reading (sensor offset)*).

### Date checks
- If the day of year computed from `Date` differs from `GMT`, flag *date and GMT day disagree in source*.
- Within a group of rows sharing a GMT day that holds more than one year, flag each row whose year appears in no row outside that group: *date year inconsistent with sibling rows (year appears nowhere else in table)*. This catches T9 and T18 (2018, GMT 175, next to 2014 rows). It leaves O20–O22 alone (2016, consistent with their GMT day).

### Constants
`investigationId` = `PSI-25`; `sourceUrl` = the PSI-25 page above.
