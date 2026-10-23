# Ethos demo script (about 3 minutes)

Motto: **Invest with purpose. Grow with confidence.** Positioning: Ethos works best for ethical charities and ethical institutions, such as law firms.

Written against the judging sheet: client focus, use of data and AI, quality of recommendation, originality, execution.
Update the "Status" lines when the real agents replace the mocks (`USE_MOCKS=0`).

## Before you go on

- [ ] `.env` has `USE_MOCKS=1` (or `0` once the real pipeline works). `DEMO_RULES=1` makes the mock results react to the client's answers; say so if you use it and a valid `AZURE_OPENAI_API_KEY`.
- [ ] `npm run dev` is running, `http://localhost:3000` loads, and you have done one dry run since the last code change (the first load after an edit can sit on "Loading…").
- [ ] Click **Start over** so the page shows the start screen.
- [ ] Have a second tab ready with a finished report (see "If something breaks").
- [ ] Browser zoom at 100%, notifications off.

## The story

One sentence to open: **"Most people want their money to follow their values but cannot tell what is really inside a fund. Ethos interviews you, screens companies against your rules, and shows its reasoning at every step."**

| Time | Do | Say | Scores on |
|---|---|---|---|
| 0:00 | Show the start page | The client is a charity or a person with a conscience, not a generic investor. We define the client by what they refuse and what they back. | Client focus |
| 0:20 | Click **Describe your own client in chat**. Answer: "A cancer research charity, money needed over decades." | The AI is interviewing, not filling a form. | Use of AI |
| 0:40 | Answer the risk question honestly, then give a grey area: "No fossil fuels, and no banks that lend to oil firms." | Watch it push back on trade-offs and probe the edge cases a form would miss. | Use of AI, originality |
| 1:10 | Say "Yes, that's right" to its summary | It turns a conversation into a structured profile: risk, exclusions, causes with a strength. | Quality |
| 1:20 | **Screen step**: hover two companies | Every company shows what it does and exactly why it is in or out. The client can overrule any call. | Quality, execution |
| 1:50 | **Ethics step**: point at the borderline company and click **Exclude this** | Close calls are shown to a human, not hidden. A fixed scoring rule decides, so it is auditable. The AI only explains. | Quality, originality |
| 2:20 | **Report**: scroll the funnel, "Your calls", donut, holdings table | From the full list down to the portfolio, with a reason for every holding and every exclusion. | Quality |
| 2:50 | Click a step in the progress bar to go back, change one thing | You can change your mind and the whole result updates. | Execution |
| 3:00 | Stop | Close with the limits (below). | Honesty |

## Say these limits yourself before a judge finds them

- **Status with `REAL_DATA=1`:** the screen and ethics check run on 332 real UK companies, and the ethics check uses cited evidence (quotes and links) for the 110 companies researched so far. Companies without evidence are shown as "not rated", never clean. The portfolio weights are a placeholder (no price data yet) and the report text is generated from the results. Do not quote returns or call the weights an investment model.
- Without `REAL_DATA=1` everything after the chat uses fictional sample companies.
- Educational project, not financial advice (it is on every screen).
- The chat is the only live AI step today. Say what is built and what is next, not more.

## Likely questions

- **"Does the AI decide who is excluded?"** No. The AI extracts facts and writes explanations. A fixed rubric decides, so results are repeatable and can be audited.
- **"What data do you use?"** A universe of 332 UK-listed companies (FTSE 100, FTSE 250 and part of SmallCap) and an evidence cache built from news and Wikipedia with verified quotes and links. We have no price data yet, so the portfolio weights are a placeholder.
- **"What if the AI gets it wrong?"** Two human checkpoints. The client approves the screen and confirms the ethics check, and every override is listed in the report.
- **"Why not just use ChatGPT?"** A chatbot gives an answer once. This keeps a structured profile, applies rules the same way every time, and shows the trail.

## If something breaks

1. **Chat shows a red error:** the API key is missing or wrong. Switch to a ready-made client on the start page and carry on.
2. **Page stuck on "Loading…":** reload once.
3. **Wi-Fi drops:** the ready-made clients and the report work with no network. The chat does not.
4. **Everything fails:** show the finished report in your spare tab and walk through it. Have a short screen recording as the last fallback.
