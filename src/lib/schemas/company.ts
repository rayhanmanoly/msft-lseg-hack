import { z } from 'zod';

/** GICS sectors. */
export const SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate',
] as const;
export const sectorSchema = z.enum(SECTORS);
export type Sector = z.infer<typeof sectorSchema>;

/** Controversial-activity tags used by the stage 1 screen. */
export const ACTIVITY_TAGS = [
  'fossil_fuels',
  'coal',
  'renewables',
  'tobacco',
  'alcohol',
  'gambling',
  'weapons',
  'adult_entertainment',
  'nuclear',
  'animal_testing',
  'palm_oil',
  'private_prisons',
  'fast_fashion',
  'ai_surveillance',
] as const;
export const activityTagSchema = z.enum(ACTIVITY_TAGS);
export type ActivityTag = z.infer<typeof activityTagSchema>;

/** One entry of data/universe.json. */
export const companySchema = z.object({
  ticker: z.string(),
  name: z.string(),
  sector: sectorSchema,
  /** Free-text industries, e.g. "Integrated Oil & Gas". */
  industries: z.array(z.string()),
  activityTags: z.array(activityTagSchema),
  /** One or two sentences, used for bucket rationales. */
  description: z.string(),
  marketCapGbpBn: z.number().optional(),
  /** How deeply the ethics cache researches it: deep = 4 searches over 7 years, basic = 1 search (coverage capped at partial). */
  tier: z.enum(['deep', 'basic']).optional(),
  index: z.enum(['FTSE100', 'FTSE250', 'SmallCap']).optional(),
});

export type Company = z.infer<typeof companySchema>;
