# Ethics cache: data structure and integration

What the cache builder produces and how to read it. For how it is built, see `docs/CACHE_BUILDER.md`. Types and validation live in `src/lib/schemas/` (`ethics.ts`, `company.ts`, `source.ts`, `causes.ts`); this doc explains meaning.

## Files

| Path | Contents | Schema |
| --- | --- | --- |
| `data/universe.json` | Array of every company in the screen universe (about 332) | `z.array(companySchema)` |
| `data/ethics/{TICKER}.json` | One evidence record per company | `ethicsRecordSchema` |

The cache is built progressively. A missing `data/ethics/{TICKER}.json` means **not researched yet or the research failed**, never "clean". Treat it as unknown.

## `data/ethics/{TICKER}.json` (`EthicsRecord`)

```jsonc
{
  "ticker": "BA",
  "generatedAt": "2026-10-23T13:41:07.512Z",
  "coverage": "full",            // "full" | "partial" | "none"
  "causes": {                     // only causes with evidence appear; absent cause = nothing found
    "anti_corruption": {
      "incidents": [
        {
          "year": 2010,
          "summary": "One neutral sentence about the incident.",
          "severity": 3,          // 1-5, see scale below
          "relativeScale": 4,     // 1-5, importance to THIS company's size
          "confirmed": true,      // false = allegation, lawsuit filed, media or NGO claim
          "remediation": 0.3,     // 0 ignored/denied ... 1 fully remedied with verified reform
          "sources": [            // 1-3, each quote is a verbatim substring of the fetched article
            {
              "url": "https://...",
              "title": "Article title",
              "publishedAt": "2010-02-06T00:00:00.000Z",   // optional
              "quote": "Exact text copied from the source."
            }
          ]
        }
      ],
      "positives": ["Short plain-text good practice, e.g. verified target or certification."]
    }
  }
}
```

### Field meanings

| Field | Meaning and how to use it |
| --- | --- |
| `coverage` | How much evidence was found. `full` = enough documents including news. `partial` = thin evidence, or the basic tier (SmallCap, one search only). `none` = nothing relevant found. **`partial` and `none` are not a pass**: show "limited information" in the UI, never "no concerns". |
| `causes` | A partial record keyed by cause id. A cause that is missing means no incident or positive was found for it. |
| `incidents` | At most 3 per cause, most serious first. One entry per real-world event (a case with investigation, plea and fine is one incident). |
| `year` | Year the incident happened. Use it for recency decay. |
| `severity` | Magnitude of harm or penalty, judged by an LLM against fixed benchmarks (below). |
| `relativeScale` | How much it matters to this company (1 = under 0.1% of annual profit, 5 = the business itself at risk). Same fine, bigger weight for a small firm. |
| `confirmed` | `true` only for a court ruling, regulator finding, settlement, guilty plea or company admission. Show allegations differently and weight them low (the planned rubric uses x0.3). |
| `remediation` | How much was fixed: 0 denied, 0.3 apology or partial steps, 0.6 penalties paid and reforms announced, 1 fully remedied. |
| `sources` | Real citations. Show the `quote` and link `url` in the UI. Quotes are verified in code, so they can be displayed as evidence. |
| `positives` | Plain strings. Not scored; use them as supporting text or for "seek" causes. |

### Severity scale

| Level | Rough meaning |
| --- | --- |
| 1 Minor | Cost under £1m, under 100 people harmed, minor environmental harm |
| 2 Moderate | £1m-£50m, 100-10,000 people, moderate local environmental harm |
| 3 Serious | £50m-£500m, 10,000-1m people, lasting damage to a river, forest or community area |
| 4 Severe | £500m-£5bn, 1m-10m people, one or two deaths, large-scale ecosystem damage |
| 5 Catastrophic | Over £5bn, over 10m people, three or more deaths, disaster-scale damage |

Conduct harm that cannot be counted (censorship, cruelty) is judged from what the quotes describe.

### Cause ids

`climate_emissions`, `biodiversity`, `fair_wages`, `labour_rights`, `supply_chain`, `animal_welfare`, `human_rights`, `data_privacy`, `diversity_inclusion`, `anti_corruption`, `tax_transparency`, `product_safety`, `customer_practices`, `community_impact`, `executive_pay`. Labels and descriptions: `CAUSES` in `src/lib/schemas/causes.ts`. The client profile's `causes[].causeId` uses the same ids, so lookup is a direct key access: `record.causes[causeId]`.

## `data/universe.json` (`Company[]`)

| Field | Meaning |
| --- | --- |
| `ticker` | Normalised, filename-safe (`BP.` becomes `BP`). Key into `data/ethics/`. |
| `name`, `description` | Display name and one or two sentences, used for bucket rationales. |
| `sector` | One of 11 GICS sectors. |
| `industries` | Free-text industry labels. |
| `activityTags` | Controversial activities for the stage 1 screen (`fossil_fuels`, `weapons`, `tobacco`, ...). LLM-assigned and **not yet human-reviewed**; some are debatable. |
| `tier` | `deep` (FTSE 100 and 250, 4 searches over 7 years plus Wikipedia) or `basic` (SmallCap, 1 search, coverage capped at `partial`). |
| `index` | `FTSE100`, `FTSE250` or `SmallCap`. |

The SmallCap list is partial (Wikipedia only publishes about 83 names). Funds and investment trusts are excluded; REITs are included.

## Reading it

```ts
import { ethicsRecordSchema, type EthicsRecord } from '@/lib/schemas';
import { loadJson } from '@/lib/fixtures'; // the loader used by src/pipeline/index.ts

/** null = not researched (missing file); never treat as clean. */
async function loadEthics(ticker: string): Promise<EthicsRecord | null> {
  try {
    return await loadJson(`data/ethics/${ticker}.json`, ethicsRecordSchema);
  } catch {
    return null;
  }
}
```

Reading is per ticker for the shortlist the client approved (about 100-200 files at most), so no LLM call scales with the universe.

## Where it plugs into the pipeline

- **Stage 1 screen** uses only `data/universe.json` (`sector`, `activityTags`, `industries`); it does not need the ethics cache.
- **Stage 2 vet** (`runVet` behind `vetStage` in `src/pipeline/index.ts`) takes the kept tickers and the client's causes, reads `data/ethics/{ticker}.json` for each, and a deterministic rubric turns incidents into exclude, borderline or pass. The rubric is **not built yet**; until then `USE_MOCKS=1` keeps using `fixtures/ethics/*.json` and `fixtures/vet-result.json`, which follow the same schema.
- **Vet and report UI**: show `summary`, `year`, `confirmed` and the `sources[].quote` as evidence, and `coverage` as a confidence note. Fictional fixtures (`MINR`, `TELX`, `SOLR`, `LEAF`) have the same shape, so UI work can use them until real data is merged.
- **Review stage** (flag-only, later) re-researches the final holdings with the same extraction code and produces a `ReviewResult` (`src/lib/schemas/review.ts`).

## Known limits (tell users where it matters)

- Recall is imperfect: some major historic scandals are missed, so no incidents does not mean no history.
- Well-documented companies look worse than obscure ones of the same behaviour (more coverage means more findings).
- Some causes are misclassified occasionally, and severity is an LLM judgement against benchmarks, not an audited figure.
- Wikipedia and news sources are the evidence base; there is no LSEG data.

## Regenerating

`npm run build:cache` is resumable and skips finished tickers (`--tickers A,B`, `--force` to redo). Audit trail for every severity decision is in `.cache/audit/{ticker}.json` (local only, not committed).
