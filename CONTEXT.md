# Context

Ethical investment assistant (hackathon, 6h). Start with `docs/TEAM_REFERENCE.md`.

## Active focus

Scaffold and contracts are done. Next: each owner builds their module against mocks (`USE_MOCKS=1`).

## Module status

| Module | Owner | Status | Notes |
|---|---|---|---|
| Schemas / contracts (`src/lib/schemas`) | Shared | Done, frozen (additive only) | Validated by `npm run check:fixtures` |
| LLM helpers (`src/lib/llm.ts`) | Orchestration | Chat + structured output verified against the portal | Function tools and `/responses` do not work on this deployment (DECISIONS 9). Embeddings still unverified |
| Session store + API routes | Orchestration | Done, smoke-tested in mock mode | Full flow works with fixtures |
| Intake agent | Orchestration | Working draft (added by Frontend, please review) | `src/agents/intake.ts` + `/api/intake`: AI interview via structured output, one turn per request, saves `session.profile` when the client confirms. No function tools (see `docs/DECISIONS.md` 9). Verified against the live portal |
| Screen agent | Orchestration | Stub | `src/agents/screen.ts` |
| Vet agent + rubric | Orchestration | Rubric written (`src/lib/rubric.ts`), real vet runs in `REAL_DATA=1` | `src/agents/vet.ts` still a stub; `realVet` in `src/pipeline/real.ts` does the work |
| Cache builder + `data/universe.json` | Orchestration | In progress (`orch/cache`) | 332 companies, 110 evidence records so far |
| Report agent | Orchestration | Stub | `src/agents/report.ts` |
| Finance `allocate()` | Finance | Stub | `src/finance/index.ts` |
| Frontend pages | Frontend | Done in mock mode | Single-page flow in `src/components/flow/`: persona start, screen approval, vet confirmation, report. Chat intake step in `IntakeStep.tsx` (`useChat`). Earlier steps are clickable in the stepper; company chips show a hover card with name, details and why they are in or out. Resumes the last session from localStorage |
| Report component registry | Frontend | Done | All nine components in `src/components/report/sections.tsx`, wired in `registry.tsx` |

## Real-data mode (`REAL_DATA=1`, added by Frontend, please review)

`src/pipeline/real.ts` runs the pipeline on `data/universe.json` and `data/ethics/` instead of fixtures. Set it in `.env`.
- **Real:** stage 1 screen (rules on sector and activity tags) and stage 2 vet (`src/lib/rubric.ts` on cited evidence). `npm run check:rubric` asserts the rubric.
- **Placeholder:** allocation (`realAllocate`) uses no price or return data. It picks up to 20 companies with the cleanest record (max 4 per sector), tilts by risk level, caps holdings. **Finance: replace it with `allocate()`** and delete `realAllocate`.
- **Not rated:** a company with no cache record, or coverage `partial` or `none`, goes in `VetResult.unrated`. It is never treated as clean and is left out unless the client includes it.
- **Schemas** were extended additively to read the new data (`sources` with quotes, `coverage`, `customer_practices`, `tier`, `index`, `VetResult.unrated`). Rayhan: if your own schema changes differ, yours win; tell me and I will adapt.
- **Rubric constants** (`RUBRIC` in `rubric.ts`): exclude at 8, borderline at 4, 12-year half-life; per cause the worst incident counts in full and the rest at half; a confirmed severity 4 or 5 incident keeps a cause at least a close call (client weight 3 or more). Cause weight scales the score (3 is neutral). See `docs/DECISIONS.md` 11. The UI shows the score as a share of the exclusion line. Tune freely.
- **Coverage today:** 110 of 332 companies have records (all FTSE 100, 10 FTSE 250, 2 SmallCap). Fair wages and supply chain have evidence for only 27 companies, so clients who care mainly about those rarely get exclusions.

## Open items

- Opt-in demo rules (`USE_MOCKS=1 DEMO_RULES=1`, `src/pipeline/demo.ts`): makes the mock screen, vet, portfolio and report react to the client's profile. Not the real logic and makes no forecasts. Off by default; delete the file and its five hooks in `src/pipeline/index.ts` when the real stages land. Orchestration: please review the hooks.
- Company logos: `Company` has no logo or domain field, so the UI shows generated initials badges (`CompanyLogo.tsx`). Orchestration: add an optional `domain` or `logoUrl` to `Company` if real logos are wanted.
- Frontend added `GET /api/companies` (universe via `loadUniverse()`), and `/screen/approve` and `/vet/confirm` now clear downstream results so the client can go back to an earlier step. Orchestration: please review.
- `.env.example` is missing from the repo (docs say to copy it). Mock mode needs `USE_MOCKS=1` in `.env`.
- `.gitignore` does not ignore `node_modules/`, `.next/`, `.data/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`.
- Confirm embeddings (`text-embedding-3-large`) work on the portal. Endpoint and chat deployment (`gpt-6.1-sol`) are confirmed.
- Confirm LSEG data availability with organisers (Finance).
- Choose news source for the cache (Google News RSS / GDELT, or a search API if provided).
