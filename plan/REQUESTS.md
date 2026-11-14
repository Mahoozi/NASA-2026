# Cross-track requests

One line each. The other side checks this file at every session start and ticks the item in the commit that resolves it.

Format: `- [ ] <from> → <to> | <what> | <why> | needed by stage <n>`

- [x] A → B | `data/investigations.json` v0 with real ids/acronyms | Lab ranking needs real targets | stage 0
- [x] B → A | `lib/match.ts` stub exporting `matchInvestigations` | `/api/ask` imports it in stage 3 | stage 0
- [x] A → B | add `OPENAI_MODEL=gpt-5.4-mini` to `.env.example` and read the model from `process.env.OPENAI_MODEL` | one agreed model, switchable | stage 1 — `.env.example` line committed (`4d3dcb2`); `/api/ask` reads it (`4b9442d`)
- [ ] A → B | `/investigations/[id]` detail page | Lab ranked cards and the runs section link to `/investigations/PSI-25` etc.; currently 404 | stage 3
- [ ] A → B | `/ask` reads `?scenario=<Scenario JSON>&investigations=PSI-25,…` and passes them as `AskRequest.context` | Lab's "Ask about this scenario" link sends them; JSON uses `lib/schema.ts` `Scenario` field names; `investigations` is omitted when no investigation scores above 0 | stage 3
