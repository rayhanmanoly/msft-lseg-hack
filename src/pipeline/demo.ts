import { useMocks } from '@/lib/env';
import { loadFixture } from '@/lib/fixtures';
import {
  causeById,
  portfolioSchema,
  vetResultSchema,
  type AllocateInput,
  type ClientProfile,
  type Portfolio,
  type VetDecision,
  type VetResult,
} from '@/lib/schemas';

/**
 * Opt-in demo rules: `USE_MOCKS=1 DEMO_RULES=1`. Makes the mock pipeline react to the client's profile so a
 * demo changes when the client's answers change. This is NOT the real screen, vet or finance logic and makes
 * no financial forecasts; it exists only until the real agents land. Off by default.
 * ponytail: delete this file and its hooks in pipeline/index.ts once the real stages work.
 */
export const demoRules = () => useMocks() && process.env.DEMO_RULES === '1';

const words = (s: string) => s.replace(/_/g, ' ');

/** Uses the fixture ethics decisions, but only for causes the client cares about. A non-negotiable cause turns a close call into an exclusion. */
export async function demoVet(profile: ClientProfile, kept: string[]): Promise<VetResult> {
  const base = await loadFixture('vet-result.json', vetResultSchema);
  const weight = new Map(profile.causes.map((c) => [c.causeId, c.weight]));
  const applies = (d: VetDecision) => kept.includes(d.ticker) && weight.has(d.causeId);

  const excluded = base.excluded.filter(applies);
  const borderline: VetDecision[] = [];
  for (const d of base.borderline.filter(applies)) {
    if (weight.get(d.causeId) === 5) {
      excluded.push({ ...d, reason: `${d.reason} You marked ${causeById(d.causeId).label.toLowerCase()} as non-negotiable, so this is excluded.` });
    } else borderline.push(d);
  }
  const flagged = new Set([...borderline, ...excluded].map((d) => d.ticker));
  const passed = kept.filter((t) => !flagged.has(t));
  return {
    passed,
    borderline,
    excluded,
    unrated: [],
    summary: `${excluded.length} excluded, ${borderline.length} borderline accepted, ${passed.length} passed cleanly.`,
  };
}

/** Weights favour low-beta companies for cautious clients and high-beta for aggressive ones. No return or risk forecasts. */
export async function demoAllocate({ companies, profile }: AllocateInput): Promise<Portfolio> {
  const template = new Map((await loadFixture('portfolio.json', portfolioSchema)).holdings.map((h) => [h.ticker, h]));
  const tilt = (profile.riskLevel - 3) * 1.5;
  const raw = companies.map((c) => Math.exp(tilt * ((template.get(c.ticker)?.metrics.beta ?? 1) - 0.8)));
  const total = raw.reduce((a, b) => a + b, 0);
  const weights = raw.map((r) => Math.round((r / total) * 1000) / 1000);
  const biggest = weights.indexOf(Math.max(...weights));
  weights[biggest] = Math.round((weights[biggest] + 1 - weights.reduce((a, b) => a + b, 0)) * 1000) / 1000;

  return {
    holdings: companies.map((c, i) => {
      const t = template.get(c.ticker);
      const conflicts = c.activityTags.filter((tag) => profile.activityExclusions.includes(tag));
      return {
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        weight: weights[i],
        financialReasons: t?.financialReasons ?? [c.description],
        ethicalReasons: t?.ethicalReasons ?? (c.ethicalNotes.length ? c.ethicalNotes : ['Passed the ethics check on your causes.']),
        flags: [
          ...(c.borderlineReason ? [`Accepted despite a concern: ${c.borderlineReason}`] : []),
          ...(conflicts.length ? [`Conflicts with a rule you set (${conflicts.map(words).join(', ')}); you overruled the screen.`] : []),
        ],
        metrics: t?.metrics ?? {},
      };
    }),
    summary: {
      methodology:
        'Demo rule, not a financial model: companies that passed are weighted by how defensive they are (market beta), tilted by the client risk level. No return or risk forecasts are made.',
    },
  };
}
