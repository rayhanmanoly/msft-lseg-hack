'use client';

import { useState } from 'react';
import type { ClientProfile, Company, ScreenApproval, ScreenBucket, ScreenResult } from '@/lib/schemas';
import { ChipList } from './ChipList';
import { CompanyChip } from './CompanyChip';
import { humanize } from './ProfileSummary';

/** Why a company is in or out: the bucket's reason plus which of the client's own rules it touches. */
function whyLines(bucket: ScreenBucket, company: Company | undefined, profile: ClientProfile, moved: boolean) {
  const lines = [`${bucket.action === 'keep' ? 'Continues' : 'Excluded'}: ${bucket.label}. ${bucket.rationale}`];
  if (company) {
    const refused = company.activityTags.filter((t) => profile.activityExclusions.includes(t));
    if (refused.length) lines.push(`Matches what you refuse: ${refused.map((t) => humanize(t).toLowerCase()).join(', ')}.`);
    if (profile.sectors.exclude.includes(company.sector)) lines.push(`In a sector you excluded: ${company.sector}.`);
    if (profile.sectors.include.includes(company.sector)) lines.push(`In a sector you prefer: ${company.sector}.`);
  }
  if (moved) lines.push('You moved this one. Click again to undo.');
  return lines;
}

/**
 * Checkpoint 1. A company chip flips between kept and excluded; the diff against the server's
 * buckets is what we send back as ScreenApproval.
 */
export function ScreenStep({
  screen,
  profile,
  companies,
  initial,
  onApprove,
  onCancel,
}: {
  screen: ScreenResult;
  profile: ClientProfile;
  companies: Record<string, Company>;
  /** Earlier decisions, when the client comes back to this step. */
  initial?: ScreenApproval;
  onApprove: (a: ScreenApproval) => void;
  onCancel?: () => void;
}) {
  const [flipped, setFlipped] = useState<Set<string>>(
    () => new Set([...(initial?.forceKeep ?? []), ...(initial?.forceExclude ?? [])]),
  );
  const [sent, setSent] = useState(false);

  const isKept = (ticker: string, action: 'keep' | 'exclude') =>
    (action === 'keep') !== flipped.has(ticker);

  const flip = (ticker: string) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (!next.delete(ticker)) next.add(ticker);
      return next;
    });

  const keptCount = screen.buckets.reduce(
    (n, b) => n + b.tickers.filter((t) => isKept(t, b.action)).length,
    0,
  );

  const approve = () => {
    setSent(true);
    onApprove({
      forceKeep: screen.buckets.filter((b) => b.action === 'exclude').flatMap((b) => b.tickers.filter((t) => flipped.has(t))),
      forceExclude: screen.buckets.filter((b) => b.action === 'keep').flatMap((b) => b.tickers.filter((t) => flipped.has(t))),
    });
  };

  return (
    <section>
      <h2>Step 1: check the first screen</h2>
      <p>{screen.summary}</p>
      <p className="muted">
        Hover over a company to see what it does and why it is in or out. Click it to move it. Crossed-out companies
        won&apos;t be considered.
      </p>

      {screen.buckets.map((b) => (
        <div key={b.id} className="card">
          <div className="head" style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>{b.label}</h3>
            <span className={`badge ${b.action}`}>{b.action === 'keep' ? 'Continues' : 'Excluded'}</span>
          </div>
          <p className="muted">{b.rationale}</p>
          <ChipList
            items={b.tickers}
            render={(t) => (
              <CompanyChip
                key={t}
                ticker={t}
                company={companies[t]}
                pressed={isKept(t, b.action)}
                disabled={sent}
                why={whyLines(b, companies[t], profile, flipped.has(t))}
                onClick={() => flip(t)}
              />
            )}
          />
        </div>
      ))}

      <div className="actions">
        <button className="btn" onClick={approve} disabled={sent || keptCount === 0}>
          Approve and check ethics ({keptCount} {keptCount === 1 ? 'company' : 'companies'})
        </button>
        {onCancel && (
          <button className="btn ghost" onClick={onCancel} disabled={sent}>
            Back to results
          </button>
        )}
        {keptCount === 0 && <small>Keep at least one company to continue.</small>}
      </div>
    </section>
  );
}
