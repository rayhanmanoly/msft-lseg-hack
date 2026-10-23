# Data Model

Source of truth is `src/lib/schemas/*.ts` (zod). This file explains semantics. Update it with any schema change.

## Reference vocabularies
- **Sectors**: 11 GICS sectors (`SECTORS`, `company.ts`).
- **Activity tags**: `fossil_fuels, coal, renewables, tobacco, alcohol, gambling, weapons, adult_entertainment, nuclear, animal_testing, palm_oil, private_prisons, fast_fashion, ai_surveillance` (`ACTIVITY_TAGS`). Used for stage 1 hard exclusions.
- **Causes**: 14 canonical ids (`CAUSES`, `causes.ts`), each with `description` used for embedding-based mapping of free-text user causes. The ethics cache is keyed by these ids.

## ClientProfile (`profile.ts`)
| Field | Meaning |
|---|---|
| `riskLevel` | 1 very cautious to 5 very aggressive. Finance uses it for allocation |
| `sectors.include / exclude` | GICS sectors. Empty include = no restriction |
| `activityExclusions` | Activity tags refused outright |
| `causes[]` | `{ causeId, stance, weight 1-5, userWords? }`. Both stances exclude on serious incidents; `seek` also rewards positives. `weight` scales vetting strictness |

## Company (`company.ts`, `data/universe.json`)
`ticker, name, sector, industries[], activityTags[], description, marketCapGbpBn?`

## ScreenResult / ScreenApproval (`screen.ts`)
Buckets `{ id, label, rationale, action: keep|exclude, tickers[] }` + `summary`. Approval = `{ forceKeep[], forceExclude[] }`. Surviving tickers = keep-buckets + forceKeep - forceExclude (`keptTickers()` in pipeline).

## EthicsRecord (`ethics.ts`, `data/ethics/{ticker}.json`)
`causes[causeId] = { incidents[], positives[] }`. Incident: `year, summary, severity 1-5, relativeScale 1-5 (vs company size), confirmed (false = allegation), remediation 0-1, sourceUrls[]`. The cache stores **factors**, never a verdict.

Rubric (`src/lib/rubric.ts`, constants in `RUBRIC`): incident score = `severity x relativeScale x (confirmed ? 1 : 0.3) x (1 - remediation) x recencyDecay` (12-year half-life). Per cause the worst incident counts in full and the others at half, scaled by `weight / 3`. A confirmed incident of severity 4 or 5 keeps the cause at least a close call when the client's weight is 3 or more. At 8 or more the company is excluded; from 4 it is borderline. `VetDecision.score` is this number, so the UI shows it as a share of the exclusion line (`percentOfLine`, 100 = excluded, 50 = close-call level).

## VetResult / VetConfirmation / VettedCompany (`vet.ts`)
`passed[]` tickers; `borderline[]` and `excluded[]` are `{ ticker, causeId, reason, score }`; `summary`. Confirmation = `{ forceInclude[], forceExclude[] }`. `VettedCompany` = `Company + ethicalNotes[] + borderlineReason?`, the finance input.

## Finance (`portfolio.ts`)
- `AllocateInput = { companies: VettedCompany[], profile }`.
- `Portfolio = { holdings[], summary }`. Holding: `ticker, name, sector, weight (0-1, sum to 1), financialReasons[], ethicalReasons[], flags[] (only if needed), metrics (free-form numbers)`. Summary: `expectedReturn?, volatility?, sharpe?, methodology`.

## ReportSpec (`report.ts`)
`{ title, sections[] }`, each section `{ component, props }`. Components and props (narrative only):
`ExecutiveSummary{headline,narrative}`, `RiskProfileCard{narrative}`, `AllocationDonut{title}`, `HoldingsTable{title,showReasons}`, `SectorBreakdown{title}`, `EthicalScreeningSummary{narrative}`, `BorderlineDecisions{narrative}`, `HoldingDeepDive{ticker,narrative}`, `RiskFlags{narrative}`. Components read numbers from `ReportData` (`profile, vet, portfolio`).

## Session (`session.ts`)
`{ id, stage, profile?, screen?, screenApproval?, vet?, vetConfirmation?, portfolio?, report?, error? }`. Stages: `intake, screen, vet, allocate, report, done`. Persisted to `.data/sessions/{id}.json` (gitignored).

## Fixtures
`fixtures/*.json` (fictional companies, mock outputs) and `data/personas/*.json` (demo client profiles). All validated by `npm run check:fixtures`.
