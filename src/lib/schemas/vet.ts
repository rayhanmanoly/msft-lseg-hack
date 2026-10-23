import { z } from 'zod';
import { causeIdSchema } from './causes';
import { companySchema } from './company';

export const vetDecisionSchema = z.object({
  ticker: z.string(),
  causeId: causeIdSchema,
  /** Client-facing explanation. */
  reason: z.string(),
  /** Rubric score, see src/lib/rubric.ts. */
  score: z.number(),
});

/** Output of the stage 2 vet agent (c). */
export const vetResultSchema = z.object({
  passed: z.array(z.string()),
  /** Accepted despite concerns; shown to the client so they can flip them. */
  borderline: z.array(vetDecisionSchema),
  excluded: z.array(vetDecisionSchema),
  /** Shortlisted companies with no usable evidence (no cache record, or coverage partial or none). Never treated as clean. */
  unrated: z.array(z.string()).default([]),
  summary: z.string(),
});

export const vetConfirmationSchema = z.object({
  /** Excluded tickers the client wants back in. */
  forceInclude: z.array(z.string()).default([]),
  /** Passed or borderline tickers the client wants out. */
  forceExclude: z.array(z.string()).default([]),
});

/** A vetted company, as handed to finance. */
export const vettedCompanySchema = companySchema.extend({
  /** Short ethical positives/notes from the cache, for ethicalReasons. */
  ethicalNotes: z.array(z.string()),
  /** Set if accepted as borderline. */
  borderlineReason: z.string().optional(),
});

export type VetDecision = z.infer<typeof vetDecisionSchema>;
export type VetResult = z.infer<typeof vetResultSchema>;
export type VetConfirmation = z.infer<typeof vetConfirmationSchema>;
export type VettedCompany = z.infer<typeof vettedCompanySchema>;
