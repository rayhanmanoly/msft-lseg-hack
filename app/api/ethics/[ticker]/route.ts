import { NextResponse } from 'next/server';
import { loadEthics } from '@/pipeline/real';

/** GET /api/ethics/:ticker -> EthicsRecord (the cited evidence). 404 means not researched yet, never "clean". */
export async function GET(_req: Request, ctx: { params: Promise<{ ticker: string }> }) {
  const record = await loadEthics((await ctx.params).ticker);
  return record
    ? NextResponse.json(record)
    : NextResponse.json({ error: 'No evidence record: not researched yet' }, { status: 404 });
}
