# Firebreak 🔥

**What NASA has burned in space, and what it hasn't.**

NASA is planning a Moon Base that will likely run at **30% oxygen or more**. Every NASA flight test of solid materials we could find with a recorded starting oxygen stopped at **22.2%**. None were done in lunar or Martian gravity.

Firebreak makes that kind of gap visible. Pick a habitat scenario, and it ranks NASA's microgravity combustion investigations by how closely they match, shows the actual test runs behind each one, points out where the evidence runs out, and answers questions using only text it can cite and verify.

**Live:** https://nasa-2026-nine.vercel.app
**Built for:** [NASA Space Apps Challenge 2026: Flame in Freefall](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/), Montréal

## What it does

- **Scenario Lab** (`/lab`): set material, oxygen, airflow and gravity, or use a preset ("ISS cabin air", "Moon Base (planned)"). Investigations are ranked with a per-dimension breakdown, and the matching runs light up on a chart.
- **Coverage grid**: material × oxygen band, every cell a count of real tests. The empty cells are the story. A separate column shows runs whose source tables never recorded oxygen at all.
- **Where the evidence runs out**: plain sentences computed from the data, like "No run with a recorded starting oxygen (140 of 263) started above 22.2%; your scenario is 30%." No risk scores, no verdicts.
- **Ask the evidence** (`/ask`): questions are answered only from NASA text. Every quote is checked word for word against its source before it's shown. If the sources don't cover it, the app says so (status `insufficient_evidence`) instead of answering.
- **Scorecard** (`/evals`): we test the Ask feature on a fixed question set and publish the results, failures included.
- **Investigations** (`/investigations`): all 24 PSI combustion investigations, filterable by safety area (prevention, detection, suppression, fundamental).
- **Download** the cleaned dataset as CSV or JSON, with every data-quality flag attached.

## The data

| Source | What we use |
|---|---|
| [NASA PSI](https://psi.nasa.gov) experiment tables | 263 test runs: BASS-II (PSI-25), BASS (PSI-26), Saffire-I, II, III (PSI-98, 99, 100) |
| PSI investigation pages | Objectives, approach and hypotheses for 24 combustion investigations |
| *A Researcher's Guide to: Combustion Science* | Page-level text for the Ask feature |
| NASA pages on Apollo 1, Apollo 13, the Mir fire and Glenn's combustion science program | Context for why this matters, and text for the Ask feature |

Raw NASA files live unmodified in `data/raw/`. The importers never correct a value: anything the source can't support (an impossible oxygen reading, a date that disagrees with its GMT day, airflow logged as a fan setting) becomes `null` plus a visible flag. Full column notes: `pipeline/psi_bass2_columns.md`, `pipeline/psi_bass_columns.md` and `pipeline/psi_saffire_columns.md`.

## How it works

```
NASA PSI tables ─► pipeline/psi_import_*  ─► data/runs.json ──────────► lib/match.ts ──► /lab
PSI pages + guide ─► pipeline/corpus_*    ─► data/corpus.json ─► lib/retrieve.ts ─► /api/ask ─► /ask
                                                                                   │
                                            data/golden.json ─► npm run evals ─► /evals
```

- **No database.** All data is JSON in the repo, built by scripts you can rerun.
- **Code ranks, AI explains.** Matching and gap detection are plain deterministic functions. The language model never produces a score, rating or ranking.
- **Retrieval:** BM25+ keyword search (MiniSearch) over the corpus. At this size it's fast, free and easy to inspect.
- **Grounded answers:** the model must quote its sources; the server checks each quote is a real substring of the cited document and drops anything that isn't.

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Recharts · Vercel AI SDK with OpenAI (`gpt-5.4-mini`) · MiniSearch · Vitest · deployed on Vercel

## Run it locally

```bash
npm install
cp .env.example .env.local     # add OPENAI_API_KEY (only /ask needs it)
npm run dev                    # http://localhost:3000
```

Rebuild the data and check it:

```bash
npm run import:psi     # PSI tables → data/runs.json (fails loudly if anything looks off)
npm run build:corpus   # PSI pages + guide → data/investigations.json and data/corpus.json
npm test               # parsers, matcher, retrieval, citation checks
npm run evals          # rerun the scorecard (uses the API key)
```

## Limits, honestly

- All imported runs are from orbit (ISS or Cygnus). PSI holds no partial-gravity combustion data yet; the [challenge brief](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/) (Details tab, "Partial-gravity data") says NASA expects to add some in future, for example from the Lunar-g Combustion Investigation (LUCI) and the Flammability of Materials on the Moon (FM2) experiment. NASA Glenn's [Combustion Science page](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/) lists FM2 among its current combustion experiments; it is not among the 24 PSI investigations we imported.
- Several tables don't record oxygen or airflow at all, so those runs can't be placed on the oxygen axis.
- This is a research and exploration tool, not a flammability certification or a safety rating.

## Team

- **Yousef Yousef** ([@YousefAkay](https://github.com/YousefAkay)): data pipeline, Scenario Lab, matching and gap analysis
- **Yusuf AlMahoozi** ([@Mahoozi](https://github.com/Mahoozi)): investigation catalog, retrieval, cited Q&A, evaluation

Built at the 2026 NASA Space Apps Challenge, Montréal. Uses NASA open data; not affiliated with or endorsed by NASA. MIT licensed.
