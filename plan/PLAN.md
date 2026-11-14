# Firebreak — shared plan (48h build)

Read this at the start of every session, then your own file: `plan/A.md` or `plan/B.md`.
Then `plan/REQUESTS.md`. Then `git log --oneline -10` to see what the other track landed.

Rules in `CLAUDE.md` override anything here.

## 1. What we are building

A web dashboard that answers one question for a mission designer:
**"Has NASA already burned something like this in microgravity, and what did it find?"**

The demo path (about 90 seconds):

1. **Home** — one-line pitch.
2. **Scenario Lab** (`/lab`, Person A) — set material, O2, flow, gravity, safety area → ranked list of PSI investigations with a coverage mark (direct / partial / none) and a chart showing where the real BASS-II runs sit relative to the scenario. A panel says plainly where the evidence runs out.
3. **Ask about this scenario** (button in Lab → `/ask`, Person B) — the scenario and top investigations are posted to `/api/ask`; the answer is a few sentences, each with citations the server has verified word-for-word against the corpus. If the evidence is not there, the answer says `insufficient_evidence`.
4. **Investigations** (`/investigations`, Person B) — cards and detail pages for every PSI combustion investigation, linking back to the Lab for the ones with run data.
5. **Scorecard** (`/evals`, Person B) — how well `/api/ask` does on a golden question set. Shows we measured ourselves.

What we are **not** building: fire-risk scores, safety verdicts, predictions. Code ranks evidence; the LLM only explains it in words that cite sources.

## 2. The contract (why two people can work at once)

`lib/schema.ts` is frozen and is the **only** interface between the two tracks. Every artifact below has exactly one producer. Consumers code against the type, not against the producer's progress.

| Artifact | Produced by | Consumed by | Type (`lib/schema.ts`) |
|---|---|---|---|
| `data/runs.json` | A — **done** | A Lab; B `/api/ask` (scenario context) | `Run[]` |
| `lib/match.ts` → `matchInvestigations(scenario, investigations, runs)` | A | A Lab; B `/api/ask` when a scenario is in the request | `InvestigationMatch[]` |
| `data/investigations.json` | B | A Lab (ranking targets); B pages | `Investigation[]` |
| `data/corpus.json` | B | B `lib/retrieve.ts` | `CorpusDoc[]` |
| `lib/retrieve.ts` → `retrieve(question, ctx)` | B | B `/api/ask` | returns `CorpusDoc[]` |
| `POST /api/ask` | B | A Lab handoff button; B `/ask` page | `AskRequest` → `AskResponse` |
| `data/golden.json` | B | B `/evals` | see `plan/B.md` |

### Stage 0 unblocking rule (first hour, both people)

Each person commits a **v0** of whatever the other consumes, before building anything else:

- **A** commits `lib/match.ts` with the final signature, returning every investigation with `score: 0`, `coverage: "none"`, `breakdown: {}`, `matchingRunIds: []`. B can import it immediately.
- **B** commits `data/investigations.json` v0: every PSI combustion investigation with real `id`, `acronym`, `name`, `url`, `safetyArea`, `fuelPhase`, `facility`, `platform`, `hasRunData` (true only for PSI-25 for now) and empty strings for `objectives` / `approach` (filled in Stage 1). Also `data/corpus.json` = `[]` and `data/golden.json` = `[]`.

Until B's v0 lands, A reads `data/investigations.sample.json` (read-only). After Stage 0, nobody waits for anybody: improvements land as commits, and the other side pulls them.

## 3. Stages

Hours are from the moment the plan is committed. If a stage overruns, use the cut list in §8, don't slide the freeze.

| Stage | Hours | A — Scenario Lab | B — Ask / Investigations / Evals |
|---|---|---|---|
| **0 Contracts** | 0–1 | `lib/match.ts` stub with final signature | `investigations.json` v0; empty `corpus.json`, `golden.json`; `.env.local` with `OPENAI_API_KEY` |
| **1 Core** | 1–10 | Real scoring in `match.ts` + `pipeline/match.test.ts`; Lab scenario form → ranked investigations with coverage badges | `pipeline/corpus_build.ts` (PSI pages + guide PDF → `corpus.json`); fill `investigations.json`; `lib/retrieve.ts` (MiniSearch); `/api/ask` with real LLM call, citation verification, `insufficient_evidence` path |
| **2 Show it** | 10–22 | Gap chart (runs scatter + scenario marker + matching runs highlighted); matching runs table with flags; "where the evidence runs out" panel | `/ask` page rendering sentences + verified citations; `/investigations` cards + `/investigations/[id]`; `golden.json` (≥10 questions) + `/evals` scorecard + `npm run evals` |
| **3 Integrate** | 22–32 | "Ask about this scenario" button → `/ask` with scenario + top investigation ids; Lab rows link to `/investigations/[id]`; Lab accepts `?investigation=` | `/api/ask` uses `matchInvestigations` when `context.scenario` is present; `hasRunData` cards link to `/lab?investigation=PSI-25`; delete `data/investigations.sample.json` |
| **4 Freeze** | 32–48 | README / REFERENCES (data sources, images); demo script; bug-only commits | Same; human deploys to Vercel; both rehearse the demo |

Each person's "done when" checks are in their own file.

## 4. Parallel-work rules

1. **Ownership is strict.** A Claude session says which person it works for and touches only that person's files (list in `CLAUDE.md`). If a task needs the other person's file, write a line in `plan/REQUESTS.md` and carry on with the v0 shape.
2. **Shared files** and the only way to touch them:
   - `package.json` / `package-lock.json`: only *add* dependencies. Commit that alone, right away, as `Add <dep>`. Never remove or bump someone else's dep.
   - `components/ui/*`: add new shadcn components with `npx shadcn@latest add <name>`, commit alone as `Add <name> component`. Never edit an existing one; wrap it in your own folder instead.
   - `app/layout.tsx`, `components/nav.tsx`, `app/page.tsx`, `app/globals.css`: frozen until Stage 4. Need a change? `plan/REQUESTS.md`.
   - `lib/schema.ts`: frozen. A change needs both humans, lands as its own commit `Change schema: <what>` before anything depends on it, and both sides update their consumers in the next commit.
   - `CLAUDE.md`, `plan/*.md`: anyone can edit; keep it to additions.
3. **Missing input from the other track?** Code against the type, leave `// TODO(A): …` or `// TODO(B): …`, keep going. Never build your own copy of the other side's artifact.
4. **Never invent data.** A number, name or citation that is not in `data/` does not exist. Stop and ask.
5. **Flags travel with the data.** Any field a pipeline could not trust is `null` plus a flag string; UI shows flags, never hides a row.

## 5. Git workflow

- Both commit straight to `main`. Small commits, one per "done when" item. Short imperative messages, no attribution lines.
- Claude never pushes. The human pushes:
  ```
  git pull --rebase origin main
  npm test && npm run lint
  git push
  ```
- Conflicts can only occur in `package.json` / lock (both added deps) or `plan/*.md`. Take both sides, run `npm install`, commit `Merge deps`.
- Raw NASA files in `data/raw` are committed as-is (except PDFs, which `.gitignore` excludes; share them outside git).

## 6. Session start checklist (every Claude session)

1. Read `CLAUDE.md`, `lib/schema.ts`, `plan/PLAN.md`, your `plan/A.md` or `plan/B.md`, `plan/REQUESTS.md`.
2. `git status` and `git log --oneline -10`. Note anything the other track landed that you consume.
3. Take the first unchecked item in your file. Tick it in the file when its "done when" passes, in the same commit as the work.
4. Before finishing a session: `npm test && npm run lint && npm run build` green, everything committed, `plan/<you>.md` ticked, requests for the other side written down.

## 7. Stop-and-ask gates

Stop and ask the human instead of guessing when:

- a value, name, measurement or citation would have to be invented to continue;
- an output could be read as a risk score, safety rating or verdict;
- `lib/schema.ts` would need to change;
- the LLM produced an answer with no citation that verifies → return `insufficient_evidence`, never patch the answer;
- a raw file in `data/raw` looks wrong (don't fix it — flag it).

## 8. Demo script and cut list

**Demo (90 s):** Home → Lab: pick "PMMA rod, 17% O2, 5 cm/s, microgravity" → show direct coverage on PSI-25, partial elsewhere, chart with the matching runs lit up, panel saying no lunar-gravity data exists → "Ask about this scenario" → answer with verified citations → open PSI-25 investigation page → Scorecard.

**Cut first if behind, in this order:**

1. `/evals` page (keep `npm run evals` as a CLI table)
2. `/investigations/[id]` detail pages (keep cards)
3. Chart annotations / highlighting (keep the scatter)
4. Gravity dimension in matching (state "all runs are ISS microgravity" as text)
5. Lab → Ask handoff (keep a plain link)

Never cut: citation verification, flags in the UI, the `insufficient_evidence` path.
