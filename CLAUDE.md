# Firebreak — NASA Space Apps 2026, Flame in Freefall

Web dashboard that summarizes, ranks and interprets NASA PSI microgravity
combustion investigations, and shows where the evidence runs out.

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui, Recharts. Deployed on Vercel.
LLM calls go through the Vercel AI SDK (OpenAI, server-side only, key in OPENAI_API_KEY).

## Hard rules
- NEVER invent NASA data, measurements, experiment names or citations.
  All data comes from files in /data. If data is missing, stop and ask.
- Raw NASA files in /data/raw are never edited.
- No fire-risk scores or safety verdicts. Code ranks evidence; the LLM only explains it.
- lib/schema.ts is frozen. Do not change it without being told to.
- Commits: short imperative messages, no AI attribution or co-author lines.
- Do not push; the human pushes.

## Ownership
- Person A (Yousef): app/lab, lib/match.ts, data/runs.json, pipeline/psi_*
- Person B: app/ask, app/investigations, app/evals, app/api/ask,
  lib/retrieve.ts, data/investigations.json, data/corpus.json, data/golden.json
- Only touch the files of the person you are working for.
