# Person B — Ask / Investigations / Evals track

Files you own: `app/ask/**`, `app/investigations/**`, `app/evals/**`, `app/api/ask/**`, `lib/retrieve.ts`, `data/investigations.json`, `data/corpus.json`, `data/golden.json`, `pipeline/corpus_*`, `pipeline/retrieve*`, `pipeline/evals*`.
(`pipeline/psi_*` belongs to A — name your pipeline files `corpus_*`.)

**Skills for this track** (see PLAN.md §8): `ai-sdk`, `rag-implementation` (chunking + citation grounding only; no vector DB), `vitest`, `tdd`, `shadcn`, `frontend-design`, `web-design-guidelines`, `writing-guidelines` (project set); `anthropic-skills:pdf`, `design:ux-copy`, `design:accessibility-review`, `/code-review`, `Explore` agent (user set). Each item below names the ones to load first.
Read `plan/PLAN.md` first. Tick items here in the same commit as the work.

## Inputs you have

- PSI investigation pages (one per combustion investigation) and the PSI guide PDF. Save every source file into `data/raw/` **unmodified** before extracting anything. PDFs are git-ignored; share them with A outside git.
- `lib/schema.ts` types: `Investigation`, `CorpusDoc`, `AskRequest`, `AskResponse`.
- `data/runs.json` and (from Stage 0) `lib/match.ts` from A.

## Stage 0 — Contracts (hour 0–1)

- [x] **`data/investigations.json` v0.** One entry per PSI combustion investigation, real values only, taken from the PSI pages: `id` (`"PSI-25"`), `acronym`, `name`, `url`, `safetyArea`, `fuelPhase`, `facility`, `platform`, `hasRunData` (true only for PSI-25 for now). `objectives` and `approach` as `""` until Stage 1.
  Done when: file parses as `Investigation[]` and includes PSI-25.
  Commit: `Add investigations.json v0`.
- [x] `data/corpus.json` = `[]`, `data/golden.json` = `[]`. Commit: `Add empty corpus and golden set`.
  Note: `data/corpus.json` already holds the 120 PSI section docs (see `pipeline/corpus_report.md`), not `[]`.
- [ ] `.env.local` with `OPENAI_API_KEY=` (never committed).
- [ ] **Vercel deploy of `main` (human runs it).** Skills: `deploy-to-vercel`, `vercel-cli-with-tokens`. Set `OPENAI_API_KEY` and `OPENAI_MODEL` in the Vercel project, never in the repo. Done when: the production URL serves `/` and every later push gets a preview URL.

## Stage 1 — Core (hour 1–10)

- [x] **`pipeline/corpus_build.ts`** (`npm run build:corpus`). Skills: `anthropic-skills:pdf` for the guide PDF text extraction; `rag-implementation` §chunking for how to split pages into docs (one doc per PSI section / PDF page is enough — no embeddings). Reads the raw PSI pages and the guide PDF, writes `data/corpus.json` as `CorpusDoc[]` and fills `objectives`, `approach`, `hypothesis`, `earthBenefits`, `doi` in `investigations.json`.
  Progress: PSI part done (24 investigations, 120 docs, all text fields filled, report written). Guide PDF and NASA web pages still to add. No `doi` in the PSI API, so it is omitted.
  Guide PDF added: 55 `guide-p<page>` docs from `data/guide-pages.json` (p. 4 has only its page number, skipped). NASA web pages still to add.
  - Doc id scheme: `psi-<n>-<section>` (`psi-25-objectives`, `psi-25-approach`, …), `guide-p<page>` one doc per PDF page, `nasa-web-<slug>`, `ntrs-<id>`.
  - `text` is the verbatim extracted text, whitespace collapsed. No summarising in the pipeline.
  - Assert: every investigation has ≥1 corpus doc; no doc has empty text; every `url` is on `psi.nasa.gov` or `nasa.gov` / `ntrs.nasa.gov`.
  Done when: `npm run build:corpus` passes its asserts and `pipeline/corpus_report.md` lists doc counts per source and per investigation.
  Commit: `Build corpus from PSI pages and guide`.
- [x] **`lib/retrieve.ts`.** Skills: `tdd`, `vitest`. `retrieve(question: string, ctx?: AskRequest["context"], k = 8): CorpusDoc[]` using MiniSearch over `title` + `text`, boosting docs whose `investigationId` is in `ctx.investigationIds`. Pure, builds the index once per process.
  Done when: `pipeline/retrieve.test.ts` shows a BASS-II question returns a `psi-25-*` doc in the top 3.
  Commit: `Add corpus retrieval`.
- [x] **`/api/ask` real implementation.** Skill: `ai-sdk` — it tells you to read `node_modules/ai/docs/` for the installed version (`ai@7`, `@ai-sdk/openai@4`); do that, don't write SDK calls from memory. We use `createOpenAI({ apiKey })` with `OPENAI_API_KEY`, not the AI Gateway. Vercel AI SDK, `@ai-sdk/openai`, server only. Prompt rule: answer in ≤4 sentences; every sentence carries ≥1 citation `{docId, quote}` where `quote` is copied verbatim from the retrieved doc; if the retrieved docs do not answer the question, return `status: "insufficient_evidence"` with an empty answer. Use `generateObject` with a zod schema shaped like `AskResponse`.
  - **Citation verification (server, after the LLM):** `verified = corpusDoc.text.includes(quote)` after whitespace collapse. Fill `url` and `title` from the corpus, never from the LLM. If a sentence has zero verified citations, drop the sentence. If no sentence survives, return `insufficient_evidence`.
  - `investigationsMentioned` = investigation ids of verified citations.
  - No API key → 503 with a clear message (so A's Lab still builds).
  Done when: `curl -X POST /api/ask -d '{"question":"What did BASS-II burn?"}'` returns ≥1 sentence with `verified: true`, and an off-topic question returns `insufficient_evidence`.
  Commit: `Implement ask API with verified citations`.

## Stage 2 — Show it (hour 10–22)

- [ ] **`/ask` page.** Skills: `shadcn`, `frontend-design` (one pass), `design:ux-copy` for the `insufficient_evidence` text. Textarea + submit; render each sentence followed by its citations as links (title → url), verified ones marked, unverified never shown. `insufficient_evidence` renders as a plain statement, not an error. Read `?scenario=` and `?investigations=` from the URL (A's handoff) and pass them as `context`.
  Commit: `Build ask page`.
- [x] **`/investigations` cards + `/investigations/[id]`.** Skills: `shadcn`, `frontend-design`. Cards: acronym, name, safety areas, fuel phases, platform, "has run data" badge. Detail: objectives, approach, hypothesis, Earth benefits, link to PSI page, corpus docs listed. Cards with `hasRunData` link to `/lab?investigation=<id>`.
  Commit: `Build investigations pages`.
- [ ] **`data/golden.json`** (≥10 items): `{ id, question, expectDocIds: string[], expectStatus: "answered" | "insufficient_evidence" }`. Include ≥3 questions that must return `insufficient_evidence` (e.g. lunar gravity, a material not in any doc).
- [ ] **`pipeline/evals.ts`** (`npm run evals`): runs every golden question through the same code path as the API (import the handler logic, not HTTP), writes `data/evals.latest.json`: per question status match, citation precision (verified ∩ expected / verified), and totals.
- [ ] **`/evals` Scorecard** reads `data/evals.latest.json`: totals on top, table per question. No LLM call at render time.
  Done when: `npm run evals` runs end to end and `/evals` shows the numbers.
  Commit: `Add golden set and scorecard`.

## Stage 3 — Integrate (hour 22–32)

- [x] `/api/ask`: when `context.scenario` is present and `investigationIds` is empty, call `matchInvestigations(scenario, investigations, runs)` from `@/lib/match` and use the top 3 ids for retrieval boosting. Mention coverage in the prompt context only as data, never as a verdict.
  Commit: `Use scenario matching in ask`.
- [ ] **UI review.** Skills: `web-design-guidelines` on `app/ask/**` and `app/investigations/**`, then `design:accessibility-review`; fix only what they flag. Commit: `Review Ask and Investigations UI`.
- [x] Delete `data/investigations.sample.json` and tell A (in `plan/REQUESTS.md`) to drop the fallback.
  Commit: `Remove sample investigations`.

## Stage 4 — Freeze (hour 32–48)

- [ ] `REFERENCES.md`: every PSI page URL, guide PDF title, NTRS ids used. Skill: `writing-guidelines`; `engineering:documentation` for the README "how it works" section.
- [ ] Rehearse `/ask` with the demo scenario; make sure the golden set includes it.
- [ ] Bug-only commits.

## Gates (stop and ask)

- A PSI page lacks a field the schema requires → leave it `""` / omit optional, note it in `pipeline/corpus_report.md`. Never fill from memory.
- The LLM returns a quote that does not verify → it is dropped; never relax the substring check.
- Any prompt wording that asks the model for a rating, risk level or recommendation → remove it.
- Need a new shadcn component → `npx shadcn@latest add <name>`, commit alone, keep going.
