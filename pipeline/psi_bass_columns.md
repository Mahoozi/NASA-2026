# PSI-26 (BASS) experimental table: columns and derivations

Source: `data/raw/PSI-26_Experimental table_BASS.csv` (never edited; found by its PSI id).
Importer: `pipeline/psi_import_bass.ts`, combined into `data/runs.json` by `npm run import:psi`.
Investigation page: https://psi.nasa.gov/physci/repo/data/investigations/PSI-26

The file has 122 data rows. One, "SOOT Cleaning" on 8/3/2012, has no test numbers. It is a maintenance entry, skipped and listed in the import report, which leaves 121 runs.
The file starts with a UTF-8 byte-order mark, which is stripped. Headers are matched after collapsing whitespace, and an unknown header stops the import.

## Columns

| Column | Meaning | Used for |
|---|---|---|
| Date | Test date, `m/d/yyyy` | `date` (ISO when parseable) |
| GMT | Day of year of the test | date check only |
| As Run Test # | Order in which tests were run | `id` |
| Test # | Planned test number (may carry a suffix: `5b`, `12-R`, `117a`) | `testId`, `id` |
| Sample # | Physical sample number; several tests can burn the same sample | material shape inference |
| Fuel Sample Material | Free-text sample description, sometimes with crew notes | `material`, notes |

**Not in this table:** oxygen, airflow, CO2, CO, outcome, PI. Oxygen and airflow are `null`, flagged "oxygen not recorded in this table" and "airflow not recorded in this table". CO2 and CO are `null` with `co.raw` empty. `events` is empty, meaning no outcome is recorded. `pi` is "not stated in table".

## Derivations

- **id** = `PSI-26:r<As Run Test #>-t<Test #>`. Neither number is unique alone: As Run 24 covers tests 12-R and 12-R2; As Run 85 covers 117 and 117a; As Runs 89–91 appear twice, on 4/16 and 4/23/2013; Test 53 appears under As Runs 107 and 115. The pair is unique, and the importer asserts it.
- **material.raw**: the cell with whitespace collapsed, notes included.
- **material.family** (`pipeline/psi_shared.ts`, case-insensitive, first match wins):
  `sibal` → SIBAL fabric; `nomex` without `pmma` → Nomex; `wax` or `candle` → wax; `pmma` + `slab` → PMMA slab; `pmma` + `sphere` → PMMA sphere; `sphere` without `pmma` → PMMA sphere + flag *material inferred as PMMA from sibling rows*; `pmma` with no shape word → PMMA sphere + flag *shape inferred from rows sharing the sample number* if another row with the same Sample # says sphere, otherwise other + flag *PMMA, shape not stated*; silicone, Ultem, "PMMA & Nomex" → other. Anything else stops the import.
- **No dimensions** are set. The "1 cm" / "2 cm" in this column could be a sphere diameter or a strip width, and the table doesn't say which. The text stays in `material.raw`.
- **Notes in the material column**: the phrases `wake ign`, `wake`, `opposed flow` and `opposed` each become an observation `{ label: "note in material column", value: <phrase> }`. `opposed` / `opposed flow` also set `flowDirection: "opposed"`. As Run 97 reads `oppsed`. It is kept as an observation and flagged *unrecognised note 'oppsed' in material column; flow direction not set*; it is not read as "opposed".
- **Dates**: ISO when `m/d/yyyy`. As Run 42 reads `6/29/\`12`: kept as written, flagged *date unparseable in source*. As Run 104 reads `5/15/2103`: kept, flagged *date year implausible in source* (outside 2008–2020). Where the day of year differs from GMT, flag *date and GMT day disagree in source*. That applies to As Run 93 (4/26/2013 is day 116; GMT 113) and to As Runs 111–116 (6/1/2013 is day 152; GMT 137 or 150).
