import { loadJson } from '@/lib/fixtures';
import { RUBRIC, rate, worstCause } from '@/lib/rubric';
import {
  causeById,
  ethicsRecordSchema,
  type ClientProfile,
  type Company,
  type EthicsRecord,
  type Holding,
  type Portfolio,
  type ReportSpec,
  type ScreenBucket,
  type ScreenResult,
  type VetDecision,
  type VetResult,
  type VetConfirmation,
} from '@/lib/schemas';

/**
 * Real-data stages: `REAL_DATA=1` reads data/universe.json and the data/ethics cache instead of fixtures.
 * Screen and vet are real (rule matching and the rubric on cited evidence). Allocation is a PLACEHOLDER: there
 * are no prices or returns yet, so it makes no financial claim. Replace `realAllocate` with src/finance when ready.
 */
export const realData = () => process.env.REAL_DATA === '1';

const words = (s: string) => s.replace(/_/g, ' ');
const sentence = (s: string) => words(s).replace(/^./, (c) => c.toUpperCase());

/** null means not researched (missing file). Never treat that as clean. */
export async function loadEthics(ticker: string): Promise<EthicsRecord | null> {
  if (!/^[A-Za-z0-9_-]+$/.test(ticker)) return null;
  try {
    return await loadJson(`data/ethics/${ticker}.json`, ethicsRecordSchema);
  } catch {
    return null;
  }
}

/** Stage 1: sector and activity rules, grouped into buckets. */
export function screenByRules(profile: ClientProfile, universe: Company[]): ScreenResult {
  const buckets = new Map<string, ScreenBucket>();
  const put = (id: string, label: string, rationale: string, action: 'keep' | 'exclude', ticker: string) => {
    const b = buckets.get(id) ?? { id, label, rationale, action, tickers: [] };
    b.tickers.push(ticker);
    buckets.set(id, b);
  };

  for (const c of universe) {
    const tag = c.activityTags.find((t) => profile.activityExclusions.includes(t));
    if (tag) put(`tag-${tag}`, sentence(tag), `You refuse ${words(tag)}.`, 'exclude', c.ticker);
    else if (profile.sectors.exclude.includes(c.sector)) {
      put(`sector-${c.sector}`, c.sector, `You excluded the ${c.sector} sector.`, 'exclude', c.ticker);
    } else if (profile.sectors.include.length && !profile.sectors.include.includes(c.sector)) {
      put('outside', 'Outside your preferred sectors', `You only want ${profile.sectors.include.join(', ')}.`, 'exclude', c.ticker);
    } else {
      put(`keep-${c.sector}`, c.sector, 'Allowed by your rules; will be checked on your causes next.', 'keep', c.ticker);
    }
  }

  const all = [...buckets.values()].sort((a, b) => (a.action === b.action ? 0 : a.action === 'exclude' ? -1 : 1));
  const kept = all.filter((b) => b.action === 'keep').reduce((n, b) => n + b.tickers.length, 0);
  return {
    buckets: all,
    summary: `${universe.length - kept} of ${universe.length} companies excluded on your sector and activity rules; ${kept} continue to the ethics check.`,
  };
}

/** Stage 2: rate each shortlisted company from the evidence cache. No record, or thin coverage, is "not rated". */
export async function realVet(profile: ClientProfile, kept: string[]): Promise<VetResult> {
  const passed: string[] = [];
  const unrated: string[] = [];
  const borderline: VetDecision[] = [];
  const excluded: VetDecision[] = [];

  for (const t of kept) {
    const record = await loadEthics(t);
    if (!record || record.coverage !== 'full') {
      unrated.push(t);
      continue;
    }
    const r = rate(record, profile);
    if (r.status === 'pass') passed.push(t);
    else (r.status === 'exclude' ? excluded : borderline).push(r.decision);
  }
  const byScore = (a: VetDecision, b: VetDecision) => b.score - a.score;
  borderline.sort(byScore);
  excluded.sort(byScore);

  return {
    passed,
    borderline,
    excluded,
    unrated,
    summary: `${excluded.length} excluded, ${borderline.length} close calls accepted, ${passed.length} passed. ${unrated.length} could not be rated because there is not enough evidence yet.`,
  };
}

const DEFENSIVE = new Set(['Utilities', 'Consumer Staples', 'Health Care', 'Communication Services']);
const MAX_HOLDINGS = 20;
const MAX_PER_SECTOR = 4;

/**
 * PLACEHOLDER allocation. Picks up to 20 companies with the cleanest ethical record (at most 4 per sector, client
 * overrides always included), then weights them: tilted towards defensive sectors for cautious clients and
 * cyclical sectors for aggressive ones, capped per holding. No prices, returns or risk estimates are used.
 */
export async function realAllocate(input: {
  universe: Company[];
  vet: VetResult;
  confirmation?: VetConfirmation;
  profile: ClientProfile;
}): Promise<Portfolio> {
  const { universe, vet, confirmation, profile } = input;
  const out = new Set(confirmation?.forceExclude ?? []);
  const forced = new Set((confirmation?.forceInclude ?? []).filter((t) => !out.has(t)));
  const borderline = new Map(vet.borderline.map((d) => [d.ticker, d]));
  const failed = new Map(vet.excluded.map((d) => [d.ticker, d]));
  const byTicker = new Map(universe.map((c) => [c.ticker, c]));

  const records = new Map<string, EthicsRecord | null>();
  const candidates = [...new Set([...vet.passed, ...borderline.keys(), ...forced])].filter((t) => !out.has(t) && byTicker.has(t));
  await Promise.all(candidates.map(async (t) => records.set(t, await loadEthics(t))));
  const concern = (t: string) => {
    const r = records.get(t);
    return r ? (worstCause(r, profile)?.score ?? 0) : RUBRIC.exclude * 2;
  };

  const chosen: string[] = [...forced].filter((t) => byTicker.has(t));
  const perSector = new Map<string, number>();
  chosen.forEach((t) => perSector.set(byTicker.get(t)!.sector, (perSector.get(byTicker.get(t)!.sector) ?? 0) + 1));
  for (const t of candidates.filter((x) => !forced.has(x)).sort((a, b) => concern(a) - concern(b))) {
    const sector = byTicker.get(t)!.sector;
    if (chosen.length >= MAX_HOLDINGS) break;
    if ((perSector.get(sector) ?? 0) >= MAX_PER_SECTOR) continue;
    chosen.push(t);
    perSector.set(sector, (perSector.get(sector) ?? 0) + 1);
  }

  // Weights: sector tilt by risk level, then cap and redistribute.
  const tilt = (profile.riskLevel - 3) * 0.35;
  let w = chosen.map((t) => Math.exp(tilt * (DEFENSIVE.has(byTicker.get(t)!.sector) ? -1 : 1)));
  const norm = (a: number[]) => a.map((x) => x / a.reduce((s, y) => s + y, 0));
  w = norm(w);
  const cap = Math.max(0.12, 1.5 / Math.max(1, chosen.length));
  for (let k = 0; k < 20 && w.some((x) => x > cap + 1e-9); k++) {
    const over = w.map((x) => x > cap);
    const free = w.reduce((s, x, i) => s + (over[i] ? 0 : x), 0);
    const room = 1 - cap * over.filter(Boolean).length;
    w = w.map((x, i) => (over[i] ? cap : free > 0 ? (x / free) * room : x));
  }
  const rounded = w.map((x) => Math.round(x * 1000) / 1000);
  if (rounded.length) {
    const big = rounded.indexOf(Math.max(...rounded));
    rounded[big] = Math.round((rounded[big] + 1 - rounded.reduce((s, x) => s + x, 0)) * 1000) / 1000;
  }

  const seeks = new Set(profile.causes.filter((c) => c.stance === 'seek').map((c) => c.causeId));
  const holdings: Holding[] = chosen.map((t, i) => {
    const c = byTicker.get(t)!;
    const rec = records.get(t);
    const positives = rec
      ? Object.entries(rec.causes).flatMap(([id, ev]) => (seeks.has(id as never) ? (ev?.positives ?? []) : [])).slice(0, 2)
      : [];
    const flags: string[] = [];
    const metrics: Record<string, number> = {};
    if (rec) metrics.concernScore = Math.round(concern(t) * 10) / 10;
    const b = borderline.get(t);
    if (b) flags.push(`Accepted despite a concern. ${b.reason}`);
    const f = failed.get(t);
    if (f) flags.push(`Failed the ethics check on ${causeById(f.causeId).label.toLowerCase()}, and you chose to include it. ${f.reason}`);
    if (!rec || rec.coverage !== 'full') flags.push('Limited information: not enough evidence to rate this company. You chose to include it.');
    const refused = c.activityTags.filter((tag) => profile.activityExclusions.includes(tag));
    if (refused.length) flags.push(`Conflicts with a rule you set (${refused.map(words).join(', ')}). You overruled the screen.`);
    return {
      ticker: t,
      name: c.name,
      sector: c.sector,
      weight: rounded[i],
      financialReasons: [`Adds ${c.sector} exposure${c.industries[0] ? ` (${c.industries[0]})` : ''}.`, c.description],
      ethicalReasons: positives.length
        ? positives
        : rec?.coverage === 'full'
          ? [`No serious concern found on the causes you chose (${Object.keys(rec.causes).length ? 'evidence reviewed' : 'no incidents found'}).`]
          : ['Not rated: limited evidence.'],
      flags,
      metrics,
    };
  });

  return {
    holdings,
    summary: {
      methodology:
        'Placeholder allocation, not a financial model: there is no price or return data yet. Up to 20 companies are chosen for the cleanest ethical record with at most 4 per sector, then weighted towards defensive or cyclical sectors by your risk level and capped per holding.',
    },
  };
}

const RISK_WORDS = ['very cautious', 'cautious', 'balanced', 'growth-focused', 'very aggressive'];

/** Report text written from the real results, using the fixed component list. */
export function buildReport(input: { profile: ClientProfile; vet: VetResult; portfolio: Portfolio }): ReportSpec {
  const { profile, vet, portfolio } = input;
  const n = portfolio.holdings.length;
  const top = [...portfolio.holdings].sort((a, b) => b.weight - a.weight)[0];
  const causes = profile.causes.map((c) => causeById(c.causeId).label.toLowerCase()).join(', ');
  const sections: ReportSpec['sections'] = [
    {
      component: 'ExecutiveSummary',
      props: {
        headline: `A ${RISK_WORDS[profile.riskLevel - 1]} portfolio of ${n} ${n === 1 ? 'company' : 'companies'}`,
        narrative: `Companies were screened on your sector and activity rules and rated on the causes you chose${causes ? ` (${causes})` : ''}. ${n} remain, weighted for a risk level of ${profile.riskLevel} of 5.`,
      },
    },
    {
      component: 'RiskProfileCard',
      props: { narrative: `A risk level of ${profile.riskLevel} of 5 means ${profile.riskLevel <= 2 ? 'favouring stable, steadier sectors' : profile.riskLevel >= 4 ? 'accepting bigger swings for more growth' : 'a middle path between stability and growth'}.` },
    },
    { component: 'AllocationDonut', props: { title: 'Where your money goes' } },
    { component: 'SectorBreakdown', props: { title: 'Sector exposure' } },
    {
      component: 'EthicalScreeningSummary',
      props: {
        narrative: `${vet.excluded.length} ${vet.excluded.length === 1 ? 'company was' : 'companies were'} excluded on the ethics check, ${vet.borderline.length} accepted with concerns and ${vet.passed.length} passed. ${vet.unrated.length ? `${vet.unrated.length} could not be rated because there is not enough evidence yet, so they are not treated as clean.` : ''}`.trim(),
      },
    },
    {
      component: 'BorderlineDecisions',
      props: { narrative: vet.borderline.length ? 'These were close calls. They are in the portfolio unless you exclude them.' : 'No company needed a close call.' },
    },
    { component: 'HoldingsTable', props: { title: 'All holdings', showReasons: true } },
    ...(top ? [{ component: 'HoldingDeepDive' as const, props: { ticker: top.ticker, narrative: `Your largest position, at ${(top.weight * 100).toFixed(1)}% of the portfolio.` } }] : []),
    { component: 'RiskFlags', props: { narrative: 'Anything flagged below is worth a second look before you invest.' } },
  ];
  return { title: 'Your Ethical Portfolio', sections };
}
