import './_env';
import assert from 'node:assert/strict';
import { RUBRIC, causeScore, incidentScore, percentOfLine, rate } from '../src/lib/rubric';
import type { ClientProfile, EthicsRecord, Incident } from '../src/lib/schemas';

/** Smallest check that fails if the rubric logic breaks. Run with `npm run check:rubric`. */
const inc = (o: Partial<Incident> = {}): Incident => ({
  year: 2026, summary: 'Test incident.', severity: 4, relativeScale: 4, confirmed: true, remediation: 0, sources: [], sourceUrls: [], ...o,
});
const profile = (weight: number): ClientProfile => ({
  riskLevel: 3, sectors: { include: [], exclude: [] }, activityExclusions: [],
  causes: [{ causeId: 'climate_emissions', stance: 'avoid', weight }],
});
const record = (incidents: Incident[]): EthicsRecord => ({
  ticker: 'T', generatedAt: '', coverage: 'full', sources: [], causes: { climate_emissions: { incidents, positives: [] } },
});

assert.equal(incidentScore(inc(), 2026), 16, 'recent confirmed unremedied: severity x scale');
assert.equal(incidentScore(inc({ confirmed: false }), 2026), 16 * RUBRIC.allegation, 'allegations weigh less');
assert.equal(incidentScore(inc({ remediation: 1 }), 2026), 0, 'fully remedied scores zero');
assert.ok(incidentScore(inc({ year: 2026 - RUBRIC.halfLifeYears }), 2026) - 8 < 1e-9, 'half-life halves it');
assert.equal(causeScore([inc()], 5, 2026), 16 * (5 / 3), 'weight scales the score');

assert.equal(rate(record([]), profile(3), 2026).status, 'pass', 'no evidence on the cause passes');
assert.equal(rate(record([inc()]), profile(3), 2026).status, 'exclude', 'serious confirmed incident excludes');
assert.equal(rate(record([inc({ severity: 2, relativeScale: 2 })]), profile(3), 2026).status, 'borderline', 'moderate incident is a close call');
assert.equal(rate(record([inc()]), profile(1), 2026).status, 'borderline', 'a nice-to-have cause only makes it a close call (16 x 1/3 = 5.3)');
assert.equal(rate(record([inc()]), profile(5), 2026).status, 'exclude', 'a non-negotiable cause excludes');

// Diminishing sum: the worst incident counts in full, the others at half.
assert.equal(causeScore([inc(), inc({ severity: 2, relativeScale: 2 })], 3, 2026), 16 + RUBRIC.otherIncidents * 4, 'worst in full, others at half');
assert.equal(causeScore([inc({ severity: 2, relativeScale: 2 }), inc()], 3, 2026), 16 + RUBRIC.otherIncidents * 4, 'order does not matter');
assert.equal(causeScore([], 3, 2026), 0, 'no incidents scores zero');
assert.equal(rate(record([inc({ severity: 2, relativeScale: 2 }), inc({ severity: 2, relativeScale: 2 }), inc({ severity: 2, relativeScale: 2 })]), profile(3), 2026).status, 'exclude', '4 + 2 + 2 = 8 reaches the line');
assert.equal(rate(record([inc({ severity: 2, relativeScale: 2 }), inc({ severity: 2, relativeScale: 2 })]), profile(3), 2026).status, 'borderline', '4 + 2 = 6 is only a close call');

// Severity floor: confirmed and serious (4 or 5) is never forgotten, if the client cares at all about the cause.
const old = inc({ year: 1990, remediation: 1 });
assert.equal(incidentScore(old, 2026), 0, 'fully remedied and old scores zero by arithmetic');
const floored = rate(record([old]), profile(3), 2026);
assert.equal(floored.status, 'borderline', 'but the floor keeps it a close call');
assert.ok(floored.status === 'borderline' && /stays a close call/.test(floored.decision.reason), 'and says why');
assert.equal(rate(record([old]), profile(1), 2026).status, 'pass', 'a nice-to-have cause has no floor');
assert.equal(rate(record([inc({ year: 1990, remediation: 1, confirmed: false })]), profile(3), 2026).status, 'pass', 'an allegation never triggers the floor');
assert.equal(rate(record([inc({ year: 1990, remediation: 1, severity: 3 })]), profile(3), 2026).status, 'pass', 'severity 3 is below the floor');

// Readable score: a share of the exclusion line.
assert.equal(percentOfLine(RUBRIC.exclude), 100);
assert.equal(percentOfLine(RUBRIC.borderline), 50);
