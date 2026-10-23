# Decisions

Append new decisions at the bottom: context, decision, consequence.

## 1. TypeScript single Next.js app, no workspaces
Vercel AI SDK is TypeScript-only and the finance module is also TypeScript. One app avoids workspace setup cost in a 6h build. Python starter moved to `legacy/`.

## 2. Contract-first with zod schemas and fixtures
Three people work in parallel; `src/lib/schemas/` plus `fixtures/` let each build against the others' outputs immediately. `npm run check:fixtures` enforces the contracts.

## 3. Mock mode isolated in `src/pipeline/index.ts`
`USE_MOCKS=1` swaps stage implementations for fixtures in one place only. Agents and finance stay free of mock logic.

## 4. LLM extracts factors, deterministic rubric decides exclusion
The ethics cache stores incident factors (severity, relative scale, confirmed, remediation). A rubric applies the "high threshold" so decisions are auditable and tunable. The LLM only writes explanations.

## 5. Report agent outputs narrative and layout only
Numbers are read from `Portfolio`/`VetResult` by components. Prevents the LLM inventing figures. Falls back to a default spec on failure.

## 6. Azure Chat Completions with deployment-based URLs
The portal sample uses `chat.completions` at `{endpoint}/openai/deployments/{model}/...`. `src/lib/llm.ts` uses `createAzure` with `useDeploymentBasedUrls` and `azure.chat()` rather than the default Responses API. Unverified until a key is available.

## 7. File-based sessions, no database
Sessions persist as JSON in `.data/sessions/`. Enough for a demo; revisit only if deploying to serverless.

## 8. Fictional companies in fixtures
Mock ethical incidents are attached to fictional companies to avoid presenting invented claims about real firms. The real universe (`data/universe.json`) is separate.

## 9. Anchor `/lib/` and `/lib64/` in `.gitignore`
The starter's Python `.gitignore` template contained bare `lib/` and `lib64/`, which match at any depth and silently ignored `src/lib/` (schemas, `llm.ts`, session store). The first scaffold commit therefore omitted it and the repo would not compile for teammates. The entries are now `/lib/` and `/lib64/` (repo root only, Python virtualenv leftovers). Consequence: if a new top-level folder is named `lib`, `build`, `dist`, `var` etc., check `git check-ignore -v <path>` because other Python-template patterns remain.

## 9. Intake uses structured output, not function tools
The portal's chat completions endpoint rejects function tools for `gpt-6.1-sol` (it demands `reasoning_effort: none`, then rejects `none`), and `/responses` returns 404. So the intake agent makes one `generateText` call per turn with `Output.object({ reply, profile | null })`, and `strictJsonSchema: false` because the profile has optional fields. The server saves the profile when the model returns it after the client confirms; the frontend detects that by re-reading the session. Revisit if the portal gains a Responses endpoint.

## 10. Real-data mode lives beside the mocks, with 'not rated' as its own outcome
`REAL_DATA=1` switches the four stages to `src/pipeline/real.ts` without touching the agent stubs, so Rayhan's agents and finance's `allocate()` can replace each stage independently. A missing or thin (`partial`, `none`) evidence record is reported as `unrated` and left out by default, because "no evidence" is not "clean" (see `docs/ETHICS_CACHE.md`). The rubric constants were set from the real score distribution (276 company-cause pairs) and are one object to retune. Allocation is a labelled placeholder until finance has price data.

## 11. Rubric revised after testing it on the severe confirmed incidents
Tested against the 209 company-cause pairs with incidents, the first rubric had three problems: (1) age and remediation multiply, so a serious confirmed incident could fade to "pass" (GSK anti-corruption, confirmed, severity 4 of 5, matters 5 of 5, 60% remedied, scored 3.6); (2) incidents were summed, so three small incidents outweighed one serious one (Unilever, HSBC excluded on stacked small incidents while Glencore's confirmed severity-4 human-rights incident was only a close call); (3) the score had no scale for the client. Changes: the worst incident counts in full and the others at half (`otherIncidents`); a confirmed incident of severity 4 or 5 keeps a cause at least a close call when the client's weight is 3 or more (`floorSeverity`, `floorMinWeight`), whatever its age; the UI shows the score as a share of the exclusion line (`percentOfLine`). Effect at weight 3: exclusions 20 -> 13, close calls 26 -> 28; at weight 1 nothing is excluded. Policy choice for orchestration: allegations still count at 30% and can still reach the line at weight 5 when stacked. Thresholds (8 and 4) and the half-life are unchanged and still a first pass.

