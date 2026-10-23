import { type CauseId, type ClientProfile, type EthicsRecord, type Incident, type VetDecision } from './schemas';

/**
 * Deterministic ethics rubric (docs/DATA_MODEL.md). The LLM never decides exclusion; the cache holds factors and
 * this turns them into pass, borderline or exclude. Constants were tuned on data/ethics (209 company-cause pairs
 * with incidents) and revised after testing against the severe confirmed incidents in it (docs/DECISIONS.md 11).
 *
 * The score of a cause is on one scale for everyone: `borderline` is a close call, `exclude` is the exclusion line.
 * The UI shows it as a share of the exclusion line (100% = excluded).
 */
export const RUBRIC = {
  /** Weighted cause score at or above this excludes the company. */
  exclude: 8,
  /** At or above this (and below exclude) the company is a close call. */
  borderline: 4,
  /** Years for an incident's weight to halve. */
  halfLifeYears: 12,
  /** Old incidents never fade below this share of their weight. */
  recencyFloor: 0.25,
  /** Multiplier for allegations (confirmed = false). */
  allegation: 0.3,
  /** Client cause weight that leaves the score unchanged (1 = nice to have, 5 = non-negotiable). */
  neutralWeight: 3,
  /** Incidents after the worst one count at this share, so many small incidents cannot outweigh one serious one. */
  otherIncidents: 0.5,
  /** A confirmed incident this severe (4 or 5) keeps the company at least a close call, however old or remedied... */
  floorSeverity: 4,
  /** ...when the client's weight for the cause is at least this (3 = important). */
  floorMinWeight: 3,
};

export const incidentScore = (i: Incident, now = new Date().getFullYear()): number => {
  const decay = Math.max(RUBRIC.recencyFloor, 0.5 ** (Math.max(0, now - i.year) / RUBRIC.halfLifeYears));
  return i.severity * i.relativeScale * (i.confirmed ? 1 : RUBRIC.allegation) * (1 - i.remediation) * decay;
};

/**
 * One cause: the worst incident counts in full, the others at half, scaled by how much the client cares
 * about the cause. Before the severity floor.
 */
export const causeScore = (incidents: Incident[], weight: number, now?: number): number => {
  const [worst = 0, ...rest] = incidents.map((i) => incidentScore(i, now)).sort((a, b) => b - a);
  return (worst + RUBRIC.otherIncidents * rest.reduce((n, s) => n + s, 0)) * (weight / RUBRIC.neutralWeight);
};

/** Confirmed and serious: never forgotten, whatever its age. */
const isSevere = (i: Incident) => i.confirmed && i.severity >= RUBRIC.floorSeverity;

/** What the client sees: the score as a share of the exclusion line. 100 or more means excluded. */
export const percentOfLine = (score: number): number => Math.round((score / RUBRIC.exclude) * 100);

export type Rating =
  | { status: 'pass' }
  | { status: 'borderline' | 'exclude'; decision: VetDecision };

const sentence = (i: Incident) => `${i.summary.replace(/\.$/, '')} (${i.year}, ${i.confirmed ? 'confirmed' : 'alleged'}${i.remediation >= 0.6 ? ', largely remedied' : ''}).`;

/**
 * The cause that worries the client most for this company: its score (after the severity floor) and the
 * incident to quote. `floored` means the floor, not the arithmetic, put it at a close call.
 */
export function worstCause(record: EthicsRecord, profile: ClientProfile, now?: number) {
  let worst: { causeId: CauseId; score: number; top: Incident; floored: boolean } | undefined;
  for (const c of profile.causes) {
    const incidents = record.causes[c.causeId]?.incidents ?? [];
    if (!incidents.length) continue;
    let score = causeScore(incidents, c.weight, now);
    const severe = incidents.filter(isSevere);
    const floored = c.weight >= RUBRIC.floorMinWeight && severe.length > 0 && score < RUBRIC.borderline;
    if (floored) score = RUBRIC.borderline;
    if (!worst || score > worst.score) {
      const pool = floored ? severe : incidents;
      const top = [...pool].sort((a, b) => incidentScore(b, now) - incidentScore(a, now))[0];
      worst = { causeId: c.causeId, score, top, floored };
    }
  }
  return worst;
}

/**
 * Rate one researched company against the client's causes. The decision names the worst cause and quotes
 * its most serious incident, so the client sees the reason and can check the sources.
 */
export function rate(record: EthicsRecord, profile: ClientProfile, now?: number): Rating {
  const worst = worstCause(record, profile, now);
  if (!worst || worst.score < RUBRIC.borderline) return { status: 'pass' };
  const status = worst.score >= RUBRIC.exclude ? 'exclude' : 'borderline';
  return {
    status,
    decision: {
      ticker: record.ticker,
      causeId: worst.causeId,
      score: Math.round(worst.score * 10) / 10,
      reason: worst.floored
        ? `${sentence(worst.top)} Because it was confirmed and serious, it stays a close call however long ago it was.`
        : sentence(worst.top),
    },
  };
}
