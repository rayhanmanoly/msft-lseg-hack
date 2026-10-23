import './_env';
import { readdir } from 'node:fs/promises';
import { z } from 'zod';
import { loadJson } from '../src/lib/fixtures';
import {
  clientProfileSchema,
  companySchema,
  ethicsRecordSchema,
  portfolioSchema,
  reportSpecSchema,
  screenResultSchema,
  vetResultSchema,
} from '../src/lib/schemas';

/** Contract test: every fixture / data file must parse against its schema. Run before merging. */
async function main() {
  const checks: [string, z.ZodType][] = [
    ['fixtures/companies.json', z.array(companySchema)],
    ['data/universe.json', z.array(companySchema)],
    ['fixtures/screen-result.json', screenResultSchema],
    ['fixtures/vet-result.json', vetResultSchema],
    ['fixtures/portfolio.json', portfolioSchema],
    ['fixtures/report-spec.json', reportSpecSchema],
  ];
  for (const f of await readdir('fixtures/ethics')) checks.push([`fixtures/ethics/${f}`, ethicsRecordSchema]);
  for (const f of await readdir('data/personas')) checks.push([`data/personas/${f}`, clientProfileSchema]);
  for (const f of await readdir('data/ethics')) {
    if (f.endsWith('.json')) checks.push([`data/ethics/${f}`, ethicsRecordSchema]);
  }

  let failed = 0;
  for (const [file, schema] of checks) {
    try {
      await loadJson(file, schema);
      console.log(`ok    ${file}`);
    } catch (e) {
      failed++;
      console.error(`FAIL  ${file}\n${e instanceof Error ? e.message : e}`);
    }
  }

  const portfolio = await loadJson('fixtures/portfolio.json', portfolioSchema);
  const sum = portfolio.holdings.reduce((s, h) => s + h.weight, 0);
  if (Math.abs(sum - 1) > 0.001) {
    failed++;
    console.error(`FAIL  fixtures/portfolio.json weights sum to ${sum}, expected 1`);
  }

  if (failed) process.exit(1);
}

main();
