# Source discrepancies

Where a PSI table disagrees with NASA's own published papers, Firebreak keeps the PSI value and
flags the difference. Nothing here changes or fills a value in `data/runs.json`; each row adds
one flag to the listed runs, and the flag shows in the Lab's runs table, the what-varied panel and
the CSV `flags` column.

Generated from `SOURCE_DISCREPANCIES` in `pipeline/source_discrepancies.ts` (the same list the
importer applies) and the flags in `data/runs.json`. 6 discrepancies.

| Investigation | Run(s) | Field | PSI table value | Published value | Source |
|---|---|---|---|---|---|
| PSI-98 | S1, S2 | sample length × width | length 40.6 cm, width 94 cm | 94 x 40.6 cm (Saffire-III's PSI table: length 94 cm, width 40.6 cm) | [NTRS 20170008805](https://ntrs.nasa.gov/citations/20170008805), abstract |
| PSI-98 | S1, S2 | thickness | 0.37 cm | 0.37 mm (I-1, I-2) | [NTRS 20180005168](https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf), p. 30, Table 1 |
| PSI-99 | 2-6 | airflow | 20 cm/s | 25 cm/s (II-6) | [NTRS 20180005168](https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf), p. 30, Table 1 |
| PSI-100 | S1, S2 | airflow | 30 cm/s | 25 cm/s (III-1, III-2) | [NTRS 20180005168](https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf), p. 16; p. 30, Table 1 |
| PSI-100 | S1, S2 | thickness | .33 cm | 0.37 mm (III-1, III-2) | [NTRS 20180005168](https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf), p. 30, Table 1 |
| PSI-100 | S1, S2 | starting oxygen | not recorded (no oxygen column) | 21.2 to 21.0% (III-1, III-2) | [NTRS 20180005168](https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf), p. 30, Table 1 |

<!-- count: 6 -->
