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

Times are America/Toronto, weekend of Sat 15 – Sun 16 Nov 2026. "Due" is when the stage's items are committed. **Local judging is Sun 15:00 at Vanier, in person: a live demo plus a 30-second video (no slides). Feature freeze is Sun 11:30. Final submission by Sun 21:00. Hard deadline Sun 23:59.** If a stage overruns, use the cut list in §9, don't slide the freeze.

**Saturday evening:** A does the landing page and the README. B does demo-answer caching and repo tidy-up.

**Sunday:**

| Time | What |
|---|---|
| by 09:00 | Any cut-list item (§9) not working is cut, not finished |
| 11:30 | Feature freeze |
| 11:30–12:30 | Record 30-second demo video (Sun 11:30–12:30), upload to YouTube unlisted, add link to submission form. |
| 11:30–13:00 | Cached demo answers |
| 13:00–14:00 | Rehearse the 90-second demo (§9) three times |
| 14:00–14:30 | Fill in and submit the Space Apps project page |
| 15:00 | Judging at Vanier: live demo + 30-second video |
| after judging | Fixes only; final submission by 21:00; hard deadline 23:59 |

| Stage | Due | A — Scenario Lab | B — Ask / Investigations / Evals |
|---|---|---|---|
| **0 Contracts** | Sat 13:45 | `lib/match.ts` stub with final signature | `investigations.json` v0; empty `corpus.json`, `golden.json`; `.env.local` with `OPENAI_API_KEY`; **Vercel deploy of `main` (human)** so every later push is a preview |
| **1 Core** | Sat 18:00 | Real scoring in `match.ts` + `pipeline/match.test.ts`; Lab scenario form → ranked investigations with coverage badges | `pipeline/corpus_build.ts` (PSI pages + guide PDF → `corpus.json`); fill `investigations.json`; `lib/retrieve.ts` (MiniSearch); `/api/ask` with real LLM call, citation verification, `insufficient_evidence` path |
| **2 Show it** | Sun 09:00 | Gap chart (runs scatter + scenario marker + matching runs highlighted); matching runs table with flags; "where the evidence runs out" panel | `/ask` page rendering sentences + verified citations; `/investigations` cards + `/investigations/[id]`; `golden.json` (≥10 questions) + `/evals` scorecard + `npm run evals` |
| **3 Integrate** | Sun 11:30 (feature freeze) | "Ask about this scenario" button → `/ask` with scenario + top investigation ids; Lab rows link to `/investigations/[id]`; Lab accepts `?investigation=` | `/api/ask` uses `matchInvestigations` when `context.scenario` is present; `hasRunData` cards link to `/lab?investigation=PSI-25`; delete `data/investigations.sample.json` |
| **4 Freeze** | Sun 11:30–21:00: judging 15:00, final submission by 21:00 | README / REFERENCES (data sources, images); demo script; bug-only commits | Same; confirm the production deploy is the frozen commit; both rehearse the demo |

Each person's "done when" checks are in their own file.

## 4. Parallel-work rules

1. **Ownership is strict.** A Claude session says which person it works for and touches only that person's files (list in `CLAUDE.md`). If a task needs the other person's file, write a line in `plan/REQUESTS.md` and carry on with the v0 shape.
2. **Shared files** and the only way to touch them:
   - `package.json` / `package-lock.json`: only *add* dependencies. Commit that alone, right away, as `Add <dep>`. Never remove or bump someone else's dep.
   - `components/ui/*`: add new shadcn components with `npx shadcn@latest add <name>`, commit alone as `Add <name> component`. Never edit an existing one; wrap it in your own folder instead.
   - `app/layout.tsx`, `components/nav.tsx`, `app/globals.css`: frozen until Stage 4. Need a change? `plan/REQUESTS.md`.
   - `app/page.tsx` (landing page): unfrozen for Person A only. Person B requests changes through `plan/REQUESTS.md`.
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
3. Take the first unchecked item in your file. Load the skills listed for it (§8) before starting. Tick it in the file when its "done when" passes, in the same commit as the work.
4. Before finishing a session: `npm test && npm run lint && npm run build` green, everything committed, `plan/<you>.md` ticked, requests for the other side written down.

## 7. Stop-and-ask gates

Stop and ask the human instead of guessing when:

- a value, name, measurement or citation would have to be invented to continue;
- an output could be read as a risk score, safety rating or verdict;
- `lib/schema.ts` would need to change;
- the LLM produced an answer with no citation that verifies → return `insufficient_evidence`, never patch the answer;
- a raw file in `data/raw` looks wrong (don't fix it — flag it).

## 8. Skills and agents: who uses what, when

Skills are reference material a Claude session loads before a task. Two sets exist:

- **Project set** (committed, same for both of us): `.claude/skills/*` managed with the `skills` CLI (`npx skills list`, lock in `skills-lock.json`). After `git pull`, nothing to install — the copies are in the repo.
- **User set** (built into Claude Code or installed per user; your session may not list all of them): `dataviz`, `/code-review`, `/simplify`, `run`, `engineering:*`, `design:*`, `anthropic-skills:pdf`, agents `Explore` and `Plan`.

Invoke with the Skill tool, or by name: "load the `ai-sdk` skill then …". If a skill is missing from your session, say so and continue without it; never block on a skill.

| Stage | Person A (Lab) | Person B (Ask / Investigations / Evals) |
|---|---|---|
| 0 Contracts | `tdd` — write `pipeline/match.test.ts` seams before scoring | `deploy-to-vercel` + `vercel-cli-with-tokens` (human runs the deploy) |
| 1 Core | `tdd` + `vitest` for `match.ts`; `shadcn` for the scenario form (Select, Input, Badge); `vercel-react-best-practices` for client/server split of `/lab` | `anthropic-skills:pdf` (user set) for extracting the guide PDF; `ai-sdk` for `/api/ask` — it says to read `node_modules/ai/docs`, do that, we have `ai@7`; `rag-implementation` **only** its chunking and citation-grounding sections (we use MiniSearch, not a vector DB); `vitest` for `retrieve.test.ts` |
| 2 Show it | `dataviz` (user set) **before** writing the gap chart; `frontend-design` for one visual pass on `/lab`; `shadcn` for Table/Tooltip/Card | `frontend-design` for `/ask` and `/investigations`; `shadcn` for cards and detail layout; `design:ux-copy` (user set) for the `insufficient_evidence` wording |
| 3 Integrate | `web-design-guidelines` review of `/lab` | `web-design-guidelines` review of `/ask`, `/investigations`; `design:accessibility-review` (user set) on both |
| 4 Freeze | `writing-guidelines` on README / REFERENCES | `writing-guidelines` on `pipeline/corpus_report.md`; `engineering:documentation` (user set) for the README "how it works" |
| any | `/code-review` before each commit that touches `match.ts`; `Explore` agent to find where the other track put something | `/code-review` before each commit that touches `/api/ask`; `Explore` agent likewise |

Installed but **not** for this project (leave them, don't load them): `vercel-react-native-skills`, `vercel-react-view-transitions`, `vercel-optimize`, `vercel-composition-patterns`.

Want another skill? `npx skills find <query>`, prefer 1K+ installs from a known source, install with `npx skills add <owner/repo@skill> -a claude-code -y`, commit `.claude/skills/<name>` and `skills-lock.json` alone as `Add <name> skill`.

## 9. Demo script and cut list

**Demo (90 s):** Home → Lab: pick "PMMA rod, 17% O2, 5 cm/s, microgravity" → show direct coverage on PSI-25, partial elsewhere, chart with the matching runs lit up, panel saying no lunar-gravity data exists → "Ask about this scenario" → answer with verified citations → open PSI-25 investigation page → Scorecard.

**Any cut-list item not working by Sunday 09:00 is cut, not finished.**

**Cut first if behind, in this order:**

1. `/investigations/[id]` detail pages (keep cards)
2. Chart annotations / highlighting (keep the scatter)
3. Lab → Ask handoff (keep a plain link)
4. Gravity dimension in matching (state "all runs are ISS microgravity" as text)

Never cut: citation verification, flags in the UI, the `insufficient_evidence` path, the `/evals` scorecard.
