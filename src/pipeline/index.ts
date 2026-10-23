import { runReport } from '@/agents/report';
import { runScreen } from '@/agents/screen';
import { runVet } from '@/agents/vet';
import { allocate } from '@/finance';
import { useMocks } from '@/lib/env';
import { loadFixture, loadJson } from '@/lib/fixtures';
import {
  companySchema,
  portfolioSchema,
  reportSpecSchema,
  screenResultSchema,
  vetResultSchema,
  type Company,
  type Portfolio,
  type ReportSpec,
  type ScreenResult,
  type Session,
  type VetResult,
} from '@/lib/schemas';
import { z } from 'zod';
import { demoAllocate, demoRules, demoVet } from './demo';
import { buildReport, realAllocate, realData, realVet, screenByRules } from './real';

/**
 * The only place that switches between mocks and real implementations.
 * Routes call these; agents and finance never know about mocks.
 */

export async function loadUniverse(): Promise<Company[]> {
  const universe = z.array(companySchema);
  return useMocks() && !realData() ? loadFixture('companies.json', universe) : loadJson('data/universe.json', universe);
}

export async function screenStage(session: Session): Promise<ScreenResult> {
  if (realData() || demoRules()) return screenByRules(session.profile!, await loadUniverse());
  if (useMocks()) return loadFixture('screen-result.json', screenResultSchema);
  return runScreen(session.profile!, await loadUniverse());
}

/** Tickers surviving stage 1 after the client's approval adjustments. */
export function keptTickers(session: Session): string[] {
  const kept = new Set(
    session.screen!.buckets.filter((b) => b.action === 'keep').flatMap((b) => b.tickers),
  );
  session.screenApproval?.forceKeep.forEach((t) => kept.add(t));
  session.screenApproval?.forceExclude.forEach((t) => kept.delete(t));
  return [...kept];
}

export async function vetStage(session: Session): Promise<VetResult> {
  if (realData()) return realVet(session.profile!, keptTickers(session));
  if (demoRules()) return demoVet(session.profile!, keptTickers(session));
  if (useMocks()) return loadFixture('vet-result.json', vetResultSchema);
  return runVet(session.profile!, keptTickers(session));
}

export async function allocateStage(session: Session): Promise<Portfolio> {
  if (realData()) {
    return realAllocate({
      universe: await loadUniverse(),
      vet: session.vet!,
      confirmation: session.vetConfirmation,
      profile: session.profile!,
    });
  }
  if (useMocks() && !demoRules()) return loadFixture('portfolio.json', portfolioSchema);
  const universe = await loadUniverse();
  const vet = session.vet!;
  const out = new Set(session.vetConfirmation?.forceExclude ?? []);
  const back = new Set(session.vetConfirmation?.forceInclude ?? []);
  const borderline = new Map(vet.borderline.map((d) => [d.ticker, d.reason]));
  const tickers = [...vet.passed, ...borderline.keys(), ...back].filter((t) => !out.has(t));
  const companies = universe
    .filter((c) => tickers.includes(c.ticker))
    .map((c) => ({ ...c, ethicalNotes: [], borderlineReason: borderline.get(c.ticker) }));
  const input = { companies, profile: session.profile! };
  return demoRules() ? demoAllocate(input) : allocate(input);
}

export async function reportStage(session: Session): Promise<ReportSpec> {
  if (realData() || demoRules()) return buildReport({ profile: session.profile!, vet: session.vet!, portfolio: session.portfolio! });
  if (useMocks()) return loadFixture('report-spec.json', reportSpecSchema);
  return runReport({ profile: session.profile!, vet: session.vet!, portfolio: session.portfolio! });
}
