# Firebreak: 30-second demo video
NASA's solid-material flight tests stop at 22.2% oxygen. None of the 263 runs were in lunar or Martian gravity.

Record Sun 11:30–12:30 on the live site (https://nasa-2026-nine.vercel.app), 1280×720 or 1920×1080.
Upload to YouTube as unlisted and add the link to the submission form.
No numbers beyond the ones below; each has its source in the last column.

| Time | Screen | Voice-over | Source |
|---|---|---|---|
| 0–6 s | Landing page, "The gap in one line" | NASA's solid-material flight tests stop at 22.2% oxygen. None of the 263 runs were in lunar or Martian gravity. | `data/runs.json`, checked against `data/raw/*.csv` |
| 6–11 s | Same, highlight "Planned Moon Base atmosphere" | A Moon Base will likely run at 30% oxygen or more. | Challenge brief: "30% or greater, with a corresponding pressure of 10.2 psi or less" |
| 11–20 s | Lab, click "Moon Base (planned)"; page scrolls to the gaps panel and coverage grid | Firebreak shows where the evidence runs out: no imported investigation covers this scenario, and every cell above 23% is empty. | Lab summary and gaps panel, computed at render |
| 20–26 s | Ask page, a cached question with its citations | Ask a question and every answer cites NASA text. In our evaluation, 64 of 64 citations were verified. | `data/evals.latest.json` (`citationsVerified` / `citations`; recheck before recording) |
| 26–30 s | Landing page hero | Firebreak: what NASA has burned in space, and what it hasn't. | Landing page headline |

## Rules for the recording
- No safety verdicts or risk words ("safe", "dangerous", "risk score").
- Say "imported runs" or "solid-material flight tests", never "NASA never tested".
- If the evals file changes before recording, use its new totals or drop the number.
- Higher-oxygen gaseous-fuel tests exist (ACME CFI-G, up to 85% oxygen, challenge brief). Don't claim 22.2% is the highest oxygen NASA has tested in microgravity.
