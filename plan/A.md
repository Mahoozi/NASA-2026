# Person A (Yousef) — Scenario Lab track

Files you own: `app/lab/**`, `lib/match.ts`, `data/runs.json`, `pipeline/psi_*`, `pipeline/match*`.
Read `plan/PLAN.md` first. Tick items here in the same commit as the work.

## Already done

- [x] Scaffold, schema, stubs (`3418429`)
- [x] BASS-II import → `data/runs.json`, 129 runs, flags, tests, report (`7050936`)
- [x] `/lab` sortable runs table with flags tooltip

## Stage 0 — Contracts (hour 0–1)

- [ ] **`lib/match.ts` stub.** Export exactly:
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

- [ ] **Scoring in `lib/match.ts`.** Pure function, no I/O. Per-dimension closeness 0..1, only for dimensions the scenario specifies:
  | Dimension | Closeness |
  |---|---|
  | `materialFamily` | exact family = 1; same base (any PMMA ↔ any PMMA) = 0.5; else 0 |
  | `o2Pct` | per run: 1 if within ±1 of `o2InitialPct`, linear to 0 at ±5; investigation value = best run |
  | `flowCmS` | per run: 1 if inside `[flowCmS.min, flowCmS.max]`, linear to 0 at 5 cm/s outside; null range = 0 |
  | `gravity` | `micro` = 1 for every ISS run; `lunar` / `martian` / `1g` = 0 (no data) |
  | `safetyArea` | 1 if in `investigation.safetyArea`, else 0 |
  - `score` = mean of specified dimensions. No specified dimension → score 0, coverage `none`.
  - `matchingRunIds` = runs of that investigation whose every run-level dimension (material, O2, flow) is ≥ 0.5.
  - `coverage`: `direct` if score ≥ 0.8 **and** at least one matching run; `partial` if score ≥ 0.4; else `none`. Investigations with `hasRunData: false` can reach at most `partial` (we have no runs to show).
  - `breakdown` keys are the dimension names above.
  Done when: `pipeline/match.test.ts` (vitest) covers each dimension with real PSI-25 runs (B14, O5b, P8, T17, M5) and a `hasRunData: false` investigation, and `npm test` passes.
  Commit: `Add investigation matching`.
- [ ] **Lab scenario form** (`app/lab/scenario-form.tsx`, client). Fields: material family (select from `MaterialFamily`), O2 % (number), flow cm/s (number), gravity (select), safety area (select). All optional. State in URL search params (`?material=PMMA%20rod&o2=17&flow=5&gravity=micro`) so a scenario is a link.
  Done when: changing a field updates the URL and the ranked list without reload.
  Commit: `Add scenario form`.
- [ ] **Ranked investigations list** (`app/lab/ranked-list.tsx`). Reads `data/investigations.json` (fallback to `data/investigations.sample.json` until B's v0 lands — leave `// TODO(B)`), calls `matchInvestigations`, shows acronym, name, coverage badge, score bar, breakdown chips, "n matching runs".
  Done when: `/lab?material=PMMA%20rod&o2=17&flow=5` puts PSI-25 first with `direct`.
  Commit: `Rank investigations in Lab`.

## Stage 2 — Show it (hour 10–22)

- [ ] **Gap chart** (`app/lab/gap-chart.tsx`, Recharts `ScatterChart`). X = `flowCmS.max` (or min when max is null), Y = `o2InitialPct`, one point per run, colour by material family, matching runs full opacity and others dimmed, scenario as a reference marker. Runs with null O2 or flow are counted in a caption ("12 runs not plotted: airflow not numeric"), never dropped silently. Load the `dataviz` skill before writing it.
  Done when: chart renders on `/lab`, legend lists families, caption counts unplotted runs.
  Commit: `Add gap chart`.
- [ ] **Matching runs table.** Reuse `app/lab/runs-table.tsx`; filter to `matchingRunIds` when a scenario is set, with a toggle "show all 129". Flags badge stays.
  Commit: `Filter runs table by scenario`.
- [ ] **"Where the evidence runs out" panel** (`app/lab/gaps-panel.tsx`). For each specified dimension with closeness 0 across *all* investigations, one plain sentence derived from data (e.g. "No run in the table was performed at lunar gravity"; "No run used Nomex at 17% O2"). Wording is templated from the breakdown, never free text, never a verdict.
  Done when: scenario with `gravity=lunar` shows the gravity sentence.
  Commit: `Add evidence gaps panel`.

## Stage 3 — Integrate (hour 22–32)

- [ ] **Handoff button.** "Ask about this scenario" → navigates to `/ask?scenario=<json>&investigations=PSI-25,PSI-xx` (top 3 by score). B's `/ask` reads those params. If B's page does not read them yet, the link still works as a plain link.
  Commit: `Link Lab to Ask`.
- [ ] **Lab accepts `?investigation=PSI-25`** and pre-filters the runs table. Rows link to `/investigations/[id]`.
  Commit: `Link Lab rows to investigations`.
- [ ] Remove the `investigations.sample.json` fallback once B has deleted the file.

## Stage 4 — Freeze (hour 32–48)

- [ ] `README.md`: screenshots, "how it works" (3 bullets), link to `pipeline/psi_bass2_columns.md`.
- [ ] `REFERENCES.md`: PSI-25 URL, guide PDF title, any image sources.
- [ ] Rehearse demo. Bug-only commits.

## Gates (stop and ask)

- `data/investigations.json` lacks a field the Lab needs → request in `plan/REQUESTS.md`, do not edit it.
- A scenario value with no supporting run → show "no data", never extrapolate.
- Anything in the Lab that reads as "safe" / "unsafe" → remove it.
