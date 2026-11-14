# Cross-track requests

One line each. The other side checks this file at every session start and ticks the item in the commit that resolves it.

Format: `- [ ] <from> → <to> | <what> | <why> | needed by stage <n>`

- [x] A → B | `data/investigations.json` v0 with real ids/acronyms | Lab ranking needs real targets | stage 0
- [x] B → A | `lib/match.ts` stub exporting `matchInvestigations` | `/api/ask` imports it in stage 3 | stage 0
- [ ] A → B | add `OPENAI_MODEL=gpt-5.4-mini` to `.env.example` and read the model from `process.env.OPENAI_MODEL` | one agreed model, switchable | stage 1
