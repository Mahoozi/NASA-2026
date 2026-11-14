# Person A (Yousef) — Scenario Lab track

Files you own: `app/lab/**`, `lib/match.ts`, `data/runs.json`, `pipeline/psi_*`, `pipeline/match*`.
Read `plan/PLAN.md` first. Tick items here in the same commit as the work.

**Skills for this track** (see PLAN.md §8): `tdd`, `vitest`, `shadcn`, `vercel-react-best-practices`, `frontend-design`, `web-design-guidelines`, `writing-guidelines` (project set); `dataviz`, `/code-review`, `Explore` agent (user set). Each item below names the ones to load first.

## Already done

- [x] Scaffold, schema, stubs (`3418429`)
- [x] BASS-II import → `data/runs.json`, 129 runs, flags, tests, report (`7050936`)
- [x] `/lab` sortable runs table with flags tooltip

## Stage 0 — Contracts (due Sat 13:45)

- [x] **`lib/match.ts` stub.** Export exactly:
  ```ts
  export function matchInvestigations(
    scenario: Scenario,
    investigations: Investigation[],
    runs: Run[],
  ): InvestigationMatch[]
  ```
  Returns one entry per investigation, sorted by `score` desc then `id`, with `score: 0`, `breakdown: {}`, `coverage: "none"`, `matchingRunIds: []`.
  Done when: `npm run build` passes and B can `import { matchInvestigations } from "@/lib/match"`.
  Commit: `Add match.ts stub`.

## Stage 1 — Core (due Sat 18:00)

- [x] **Scoring in `lib/match.ts`.** Skills: `tdd` (agree the seams: the exported function only), `vitest`. Pure function, no I/O. Per-dimension closeness 0..1, only for dimensions the scenario specifies:
  | Dimension | Closeness |
  |---|---|
  | `materialFamily` | exact family = 1; same base (any PMMA ↔ any PMMA) = 0.5; else 0 |
  | `o2Pct` | per run: 1 if within ±1 of `o2InitialPct`, linear to 0 at ±5; investigation value = best run |
  | `flowCmS` | per run: 1 if inside `[flowCmS.min, flowCmS.max]`, linear to 0 at 5 cm/s outside; null range = 0 |
  | `gravity` | `micro` = 1 for every ISS run; `lunar` / `martian` / `1g` = 0 (no data) |
  | `safetyArea` | 1 if in `investigation.safetyArea`, else 0 |
  - **Run-level dimensions (material, O2, flow) are scored per run, as a set.** For each investigation with runs, compute every run's mean over the run-level dimensions the scenario specifies, pick the single best run, and use *that run's* per-dimension values in `breakdown`. Never take the best O2 from one run and the best flow from another. Investigation-level dimensions (gravity, safetyArea) are added to the same breakdown.
  - `score` = mean of specified dimensions. No specified dimension → score 0, coverage `none`.
  - `matchingRunIds` = runs of that investigation whose every specified run-level dimension is ≥ 0.5.
  - `coverage`: `direct` if score ≥ 0.8 **and** at least one matching run; `partial` if score ≥ 0.4; else `none`. Investigations with `hasRunData: false` can reach at most `partial` (we have no runs to show).
  - `breakdown` keys are the dimension names above.
  - **Amended (Stage 2):** run-level dimensions are material, O2, flow **and gravity**, and they are scored only for investigations that have runs in `data/runs.json`. An investigation without runs is scored on `safetyArea` alone when the scenario sets it; otherwise score 0, coverage `none`, and the UI labels it "no test-level data imported".
  Done when: `pipeline/match.test.ts` (vitest) covers each dimension with real PSI-25 runs (B14, O5b, P8, T17, M5) and a `hasRunData: false` investigation, and `npm test` passes.
  Commit: `Add investigation matching`.
- [x] **Lab scenario form** (`app/lab/scenario-form.tsx`, client). Skills: `shadcn` (add Select via `npx shadcn@latest add select`, commit alone), `vercel-react-best-practices`. Fields: material family (select from `MaterialFamily`), O2 % (number), flow cm/s (number), gravity (select), safety area (select). All optional. State in URL search params (`?material=PMMA%20rod&o2=17&flow=5&gravity=micro`) so a scenario is a link.
  Two preset buttons, each with a visible source line under it:
  - **ISS cabin air** → `o2=21`, `gravity=micro`. Source line computed from `data/runs.json`: "BASS-II runs started at <min>–<max>% O2 in ISS air", min/max over runs with `o2InitialPct ≥ 20.5`.
  - **Moon Base (planned)** → `o2=30`, `pressure=10.2`, `gravity=lunar`. Source line: "NASA Space Apps challenge brief: likely 30% oxygen or more at 10.2 psi or less."
  - Under the pressure field: "Pressure is context only; the BASS-II table does not record it."
  Done when: changing a field updates the URL and the ranked list without reload; each preset sets the URL in one click and its source line shows real numbers.
  Commit: `Add scenario form`.
- [x] **Ranked investigations list** (`app/lab/ranked-list.tsx`). Reads `data/investigations.json` (fallback to `data/investigations.sample.json` until B's v0 lands — leave `// TODO(B)`), calls `matchInvestigations`, shows acronym, name, coverage badge, score bar, breakdown chips, "n matching runs".
  Done when: `/lab?material=PMMA%20rod&o2=17&flow=5` puts PSI-25 first with `direct`.
  Commit: `Rank investigations in Lab`.

## Stage 2 — Show it (due Sun 09:00)

Page order on `/lab`: presets and form → summary + gaps panel → coverage grid → gap chart → ranked investigations → runs table → download.

- [x] **Ranked list never shows a 0-score item as "top".** Only investigations scoring above 0 are listed. When none does, the list is replaced by the plain statement "No imported investigation covers this scenario", followed by the gaps panel.
  Commit: `Hide zero-score investigations`.
- [x] **Gap chart** (`app/lab/gap-chart.tsx`, Recharts `ScatterChart`). X = `flowCmS.max` (or min when max is null), Y = `o2InitialPct`, one point per run, colour by material family, matching runs full opacity and others dimmed, scenario as a reference marker. Runs with null O2 or flow are counted in a caption ("12 runs not plotted: airflow not numeric"), never dropped silently. Skills: `dataviz` (load before writing a line of chart code), then `frontend-design` for one visual pass over the whole `/lab` page.
  Also: Y axis fixed at 10–36% so the empty region above the data is visible; a shaded band from 30% up labelled "Moon Base planned atmosphere (≥30% O2, NASA challenge brief)"; the scenario marker is drawn even when it falls in empty space (a line when only one of O2 / flow is set).
  Done when: chart renders on `/lab`, legend lists families, caption counts unplotted runs.
  Commit: `Add gap chart`.
- [x] **Coverage grid** (`app/lab/coverage-grid.tsx`). Rows = material families, columns = starting-O2 bands <15, 15–17, 17–19, 19–21, 21–23, 23–30, 30–36 (lower-inclusive). Each cell shows the run count; zero cells are visibly empty and styled as gaps. Clicking a cell sets the scenario's material and the band's midpoint O2 (<15 uses 12.5, the chart's 10–15 range). Caption: "Microgravity only. No partial-gravity runs exist in PSI."
  Commit: `Add coverage grid`.
- [x] **Dataset download.** "Download cleaned dataset (CSV)" and "(JSON)", client-side, all runs with every field. CSV: flags and events joined by "; ", first line a `#` comment with the PSI-25 source URL. JSON: `{ note, sourceUrls, runs }` with `runs` as `Run[]` (including `flowDirection` and `observations`).
  Commit: `Add dataset download`.
- [x] **Matching runs table.** Reuse `app/lab/runs-table.tsx`; filter to `matchingRunIds` when a scenario is set, with a toggle "show all 129". Flags badge stays. Runs with no event keyword display "outcome not recorded", never a dash or anything implying the sample kept burning (applies from Stage 1 on).
  Commit: `Filter runs table by scenario`.
- [x] **"Where the evidence runs out" panel** (`app/lab/gaps-panel.tsx`). For each specified dimension with closeness 0 across *all* investigations, one plain sentence that carries the numbers computed from `data/runs.json`, e.g. "No run started above 22.2% oxygen; your scenario is 30%." or "0 of 129 runs were at lunar gravity." or "No run used Nomex between 16% and 18% O2." Every number in a sentence is computed at render time, never hardcoded; wording is templated, never free text, never a verdict.
  Plus a "nearest evidence" line per numeric dimension set, e.g. "Highest starting oxygen in any run: 22.2% (test X). Your scenario: 30%, a gap of 7.8 points." For gravity other than micro: "0 of 129 runs were at lunar gravity; NASA's challenge brief states PSI holds no partial-gravity combustion data." No verdict words.
  Done when: scenario with `gravity=lunar` shows the gravity sentence.
  Commit: `Add evidence gaps panel`.

## Stage 3 — Integrate (due Sun 11:30, feature freeze)

- [x] **UI review.** Skill: `web-design-guidelines` on `app/lab/**`; fix only what it flags. Commit: `Review Lab UI`.
- [x] **Handoff button.** "Ask about this scenario" → navigates to `/ask?scenario=<json>&investigations=PSI-25,PSI-xx` (top 3 by score). B's `/ask` reads those params. If B's page does not read them yet, the link still works as a plain link.
  Commit: `Link Lab to Ask`.
- [x] **Lab accepts `?investigation=PSI-25`** and pre-filters the runs table. Rows link to `/investigations/[id]`.
  Commit: `Link Lab rows to investigations`.
- [x] Remove the `investigations.sample.json` fallback once B has deleted the file.

## Stage 3b — Evidence depth (Sat 16:00–22:00, hard cut 22:00)

Rules: see `plan/PLAN.md` Stage 3b. Anything unfinished at 22:00 is cut.

- [x] **A3b.1 Bounds caveat (15 min).** Where the Saffire-II "bounds" sentence appears, add: published tests suggest flammability may peak near lunar gravity, so normal-gravity and microgravity results may not bound it; this is what LUCI and FM2 are meant to test. Cite NTRS 20210022402 (https://ntrs.nasa.gov/api/citations/20210022402/downloads/217-_GollnerMichaelJ.pdf) and NTRS 20240015307 (https://ntrs.nasa.gov/citations/20240015307). Quote only text fetched from those URLs.
  Commit: `Add partial-gravity caveat to bounds note`.
- [x] **A3b.2 Recorded flammability limits model (≈3 h).** `lib/limits.ts` + Lab panel "Recorded flammability limits".
  - Limit points from PSI-25 runs with events: extinction (expect 18), blowoff (7), no-ignition (2). Extinction flow = the last flow step before "ext" (`flowCmS.min`), blowoff flow = the step where blowoff occurred (`flowCmS.max`); oxygen = `o2InitialPct` as recorded (show `o2FinalPct` if present). Keep `testId` and flags on every point. If the raw flow text is ambiguous, exclude the point with a written reason.
  - Verify every point against `data/raw` (not `runs.json` alone); write `pipeline/limits_report.md` listing each point, its raw text, and any exclusions.
  - Chart: O2 (y) vs airflow (x, log), extinction ▼, blowoff ▲, no-ignition ×, all other runs grey labelled "outcome not recorded", shaded tested envelope per material, scenario marker.
  - Output text: nearest recorded limits for the scenario's material (test id, O2, flow, event, flags) and whether the scenario is inside the tested envelope on each dimension.
  - Refusal (must show on Moon Base and Pressurized rover presets): "No recorded limit near this scenario. Firebreak does not extrapolate beyond tested conditions." Triggered when O2 is outside the recorded range for that material, gravity ≠ micro, or the material has no limit points.
  - Optional dashed line between adjacent extinction points of the same material, labelled "line between recorded points, not a fit". No regression or ML.
  - Tests: B14 → extinction, 15%, 2 cm/s; B18 → blowoff, 17.4%, 10 cm/s; point counts match the report; Moon Base → refusal; a banned-words test (safe, unsafe, risk, rating, probability, likely) over the panel text.
  Commit: `Add recorded flammability limits`.
- [x] **A3b.5 What varied and what was held fixed (≈1 h).** Lab section below Ranked investigations, computed only from `data/runs.json`. For each investigation with run data (PSI-25, PSI-26, PSI-98, PSI-99, PSI-100), one row per dimension: material family (and shapes), thickness, width/diameter, starting O2, airflow, flow direction, measurements recorded (CO, CO2, events, observations, 1-g comparison). Each cell: "varied: <range or list>", "held fixed: <value>", or "not recorded" (all null), with the count of runs behind it. Never fill a value from memory; flagged values keep their flag marker. Highlight the investigations matched for the current scenario.
  - Tests: PSI-25 O2 varied 13.6–22.2; PSI-26 O2 "not recorded"; PSI-100 airflow matches `runs.json`; no cell says "varied" when all non-null values are equal.
  Commit: `Add what-varied panel`.
- [ ] **A3b.3 Published findings panel (≈45 min, after B pushes `findings.json`).** In the Lab, show up to 3 findings whose tags overlap the scenario (material, O2, flow, gravity, or topic `partial-gravity` when gravity is lunar/martian). Each shows claim, verbatim quote, source link, and label "Published finding; quote verified against source". Empty state if none match.
  Commit: `Show published findings in Lab`.
  - Panel built and tested against a fixture in `app/lab/findings.test.ts` (commit `Add published findings panel`). Hidden while `data/findings.json` has no verified entries. Tick once B's file is on `main` and the panel shows real entries on the demo scenario and Moon Base.
- [x] **A3b.4 Optional, only if started before 21:00.** "NASA Exploration Atmosphere" preset (8.2 psia, 34% O2) cited to NTRS 20220011152 (https://ntrs.nasa.gov/api/citations/20220011152/downloads/Exploration%20Atmosphers%20OAF%2020220805.pdf); quote only fetched text.

## Stage 4 — Freeze (Sun 11:30–21:00: judging 15:00, final submission by 21:00)

- [ ] `README.md`: screenshots, "how it works" (3 bullets), link to `pipeline/psi_bass2_columns.md`. Skill: `writing-guidelines`.
- [ ] `REFERENCES.md`: PSI-25 URL, guide PDF title, any image sources.
- [ ] Rehearse demo. Bug-only commits.
- [ ] Record 30-second demo video (Sun 11:30–12:30), upload to YouTube unlisted, add link to submission form.
- [ ] Rehearse the demo three times.

## Gates (stop and ask)

- `data/investigations.json` lacks a field the Lab needs → request in `plan/REQUESTS.md`, do not edit it.
- A scenario value with no supporting run → show "no data", never extrapolate.
- Anything in the Lab that reads as "safe" / "unsafe" → remove it.
