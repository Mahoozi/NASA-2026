# Person A (Yousef) — Scenario Lab track

Files you own: `app/lab/**`, `lib/match.ts`, `data/runs.json`, `pipeline/psi_*`, `pipeline/match*`.
Read `plan/PLAN.md` first. Tick items here in the same commit as the work.

**Skills for this track** (see PLAN.md §8): `tdd`, `vitest`, `shadcn`, `vercel-react-best-practices`, `frontend-design`, `web-design-guidelines`, `writing-guidelines` (project set); `dataviz`, `/code-review`, `Explore` agent (user set). Each item below names the ones to load first.

## Already done

- [x] Scaffold, schema, stubs (`3418429`)
- [x] BASS-II import → `data/runs.json`, 129 runs, flags, tests, report (`7050936`)
- [x] `/lab` sortable runs table with flags tooltip

## Stage 0 — Contracts (hour 0–1)

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

## Stage 1 — Core (hour 1–10)

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

## Stage 2 — Show it (due Sun 13:00)

Page order on `/lab`: presets and form → summary + gaps panel → coverage grid → gap chart → ranked investigations → runs table → download.

- [ ] **Ranked list never shows a 0-score item as "top".** Only investigations scoring above 0 are listed. When none does, the list is replaced by the plain statement "No imported investigation covers this scenario", followed by the gaps panel.
  Commit: `Hide zero-score investigations`.
- [ ] **Gap chart** (`app/lab/gap-chart.tsx`, Recharts `ScatterChart`). X = `flowCmS.max` (or min when max is null), Y = `o2InitialPct`, one point per run, colour by material family, matching runs full opacity and others dimmed, scenario as a reference marker. Runs with null O2 or flow are counted in a caption ("12 runs not plotted: airflow not numeric"), never dropped silently. Skills: `dataviz` (load before writing a line of chart code), then `frontend-design` for one visual pass over the whole `/lab` page.
  Also: Y axis fixed at 10–36% so the empty region above the data is visible; a shaded band from 30% up labelled "Moon Base planned atmosphere (≥30% O2, NASA challenge brief)"; the scenario marker is drawn even when it falls in empty space (a line when only one of O2 / flow is set).
  Done when: chart renders on `/lab`, legend lists families, caption counts unplotted runs.
  Commit: `Add gap chart`.
- [ ] **Coverage grid** (`app/lab/coverage-grid.tsx`). Rows = material families, columns = starting-O2 bands <15, 15–17, 17–19, 19–21, 21–23, 23–30, 30–36 (lower-inclusive). Each cell shows the run count; zero cells are visibly empty and styled as gaps. Clicking a cell sets the scenario's material and the band's midpoint O2 (<15 uses 12.5, the chart's 10–15 range). Caption: "Microgravity only. No partial-gravity runs exist in PSI."
  Commit: `Add coverage grid`.
- [ ] **Dataset download.** "Download cleaned dataset (CSV)" and "(JSON)", client-side, all runs with every field. CSV: flags and events joined by "; ", first line a `#` comment with the PSI-25 source URL. JSON: `{ note, sourceUrl, runs }` with `runs` as `Run[]`.
  Commit: `Add dataset download`.
- [ ] **Matching runs table.** Reuse `app/lab/runs-table.tsx`; filter to `matchingRunIds` when a scenario is set, with a toggle "show all 129". Flags badge stays. Runs with no event keyword display "outcome not recorded", never a dash or anything implying the sample kept burning (applies from Stage 1 on).
  Commit: `Filter runs table by scenario`.
- [ ] **"Where the evidence runs out" panel** (`app/lab/gaps-panel.tsx`). For each specified dimension with closeness 0 across *all* investigations, one plain sentence that carries the numbers computed from `data/runs.json`, e.g. "No run started above 22.2% oxygen; your scenario is 30%." or "0 of 129 runs were at lunar gravity." or "No run used Nomex between 16% and 18% O2." Every number in a sentence is computed at render time, never hardcoded; wording is templated, never free text, never a verdict.
  Plus a "nearest evidence" line per numeric dimension set, e.g. "Highest starting oxygen in any run: 22.2% (test X). Your scenario: 30%, a gap of 7.8 points." For gravity other than micro: "0 of 129 runs were at lunar gravity; NASA's challenge brief states PSI holds no partial-gravity combustion data." No verdict words.
  Done when: scenario with `gravity=lunar` shows the gravity sentence.
  Commit: `Add evidence gaps panel`.

## Stage 3 — Integrate (hour 22–32)

- [ ] **UI review.** Skill: `web-design-guidelines` on `app/lab/**`; fix only what it flags. Commit: `Review Lab UI`.
- [ ] **Handoff button.** "Ask about this scenario" → navigates to `/ask?scenario=<json>&investigations=PSI-25,PSI-xx` (top 3 by score). B's `/ask` reads those params. If B's page does not read them yet, the link still works as a plain link.
  Commit: `Link Lab to Ask`.
- [ ] **Lab accepts `?investigation=PSI-25`** and pre-filters the runs table. Rows link to `/investigations/[id]`.
  Commit: `Link Lab rows to investigations`.
- [ ] Remove the `investigations.sample.json` fallback once B has deleted the file.

## Stage 4 — Freeze (hour 32–48)

- [ ] `README.md`: screenshots, "how it works" (3 bullets), link to `pipeline/psi_bass2_columns.md`. Skill: `writing-guidelines`.
- [ ] `REFERENCES.md`: PSI-25 URL, guide PDF title, any image sources.
- [ ] Rehearse demo. Bug-only commits.

## Gates (stop and ask)

- `data/investigations.json` lacks a field the Lab needs → request in `plan/REQUESTS.md`, do not edit it.
- A scenario value with no supporting run → show "no data", never extrapolate.
- Anything in the Lab that reads as "safe" / "unsafe" → remove it.
