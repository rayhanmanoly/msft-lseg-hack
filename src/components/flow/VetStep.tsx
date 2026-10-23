'use client';

import { useState } from 'react';
import { RUBRIC, percentOfLine } from '@/lib/rubric';
import { causeById, type Company, type VetConfirmation, type VetDecision, type VetResult } from '@/lib/schemas';
import { ChipList } from './ChipList';
import { CompanyChip } from './CompanyChip';
import { CompanyLogo } from './CompanyLogo';
import { Evidence } from './Evidence';

/** Checkpoint 2. Borderline companies are in by default and can be excluded; excluded ones can be brought back. */
export function VetStep({
  vet,
  companies,
  initial,
  onConfirm,
  onCancel,
}: {
  vet: VetResult;
  companies: Record<string, Company>;
  /** Earlier decisions, when the client comes back to this step. */
  initial?: VetConfirmation;
  onConfirm: (c: VetConfirmation) => void;
  onCancel?: () => void;
}) {
  const [out, setOut] = useState<Set<string>>(() => new Set(initial?.forceExclude)); // passed or borderline tickers the client excluded
  const [back, setBack] = useState<Set<string>>(() => new Set(initial?.forceInclude)); // excluded tickers the client brought back
  const [sent, setSent] = useState(false);

  const toggle = (set: Set<string>, ticker: string, update: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (!next.delete(ticker)) next.add(ticker);
    update(next);
  };

  const total =
    vet.passed.filter((t) => !out.has(t)).length +
    vet.borderline.filter((d) => !out.has(d.ticker)).length +
    back.size;

  return (
    <section>
      <h2>Step 2: confirm the ethics check</h2>
      <p>{vet.summary}</p>
      <details className="how-scored">
        <summary>How is this scored?</summary>
        <p>
          Each incident is scored on how serious it was, how much it matters to that company, whether it was confirmed
          (allegations count at {Math.round(RUBRIC.allegation * 100)}%), how much was fixed, and how recent it is (its weight
          halves every {RUBRIC.halfLifeYears} years). For each cause the worst incident counts in full and the others at half. Your
          weight for the cause then scales the result.
        </p>
        <p>
          At 100% of the exclusion line a company is excluded. From {percentOfLine(RUBRIC.borderline)}% it is a close call. A confirmed
          serious incident (severity {RUBRIC.floorSeverity} or 5) keeps a company at least a close call however old it is, as long as
          you rate that cause as important or more.
        </p>
      </details>

      <div className="card">
        <h3>Passed cleanly ({vet.passed.length})</h3>
        <p className="muted">No serious concerns on your causes. Hover for details, click one to exclude it.</p>
        <ChipList
          items={vet.passed}
          limit={16}
          render={(t) => (
            <CompanyChip
              key={t}
              ticker={t}
              company={companies[t]}
              tone="good"
              pressed={!out.has(t)}
              disabled={sent}
              onClick={() => toggle(out, t, setOut)}
            />
          )}
        />
      </div>

      {vet.borderline.length > 0 && (
        <div className="card">
          <h3>Accepted with concerns ({vet.borderline.length})</h3>
          <p className="muted">Close calls. They are in the portfolio unless you exclude them.</p>
          {vet.borderline.map((d) => (
            <Decision
              key={d.ticker}
              d={d}
              company={companies[d.ticker]}
              tone="warn"
              pressed={out.has(d.ticker)}
              label={out.has(d.ticker) ? 'Excluded (undo)' : 'Exclude this'}
              disabled={sent}
              onToggle={() => toggle(out, d.ticker, setOut)}
            />
          ))}
        </div>
      )}

      {vet.excluded.length > 0 && (
        <div className="card">
          <h3>Excluded ({vet.excluded.length})</h3>
          <p className="muted">These failed the check on your causes. You can overrule that.</p>
          {vet.excluded.map((d) => (
            <Decision
              key={d.ticker}
              d={d}
              company={companies[d.ticker]}
              tone="bad"
              pressed={back.has(d.ticker)}
              label={back.has(d.ticker) ? 'Included anyway (undo)' : 'Include anyway'}
              disabled={sent}
              onToggle={() => toggle(back, d.ticker, setBack)}
            />
          ))}
        </div>
      )}

      {vet.unrated.length > 0 && (
        <div className="card">
          <h3>Not rated: limited information ({vet.unrated.length})</h3>
          <p className="muted">
            Ethos has no usable evidence on these yet, so it cannot say they are clean. They are left out unless you
            include them. Click one to include it.
          </p>
          <ChipList
            items={vet.unrated}
            limit={12}
            render={(t) => (
              <CompanyChip
                key={t}
                ticker={t}
                company={companies[t]}
                tone="warn"
                pressed={back.has(t)}
                disabled={sent}
                onClick={() => toggle(back, t, setBack)}
              />
            )}
          />
        </div>
      )}

      <div className="actions">
        <button
          className="btn"
          disabled={sent || total === 0}
          onClick={() => {
            setSent(true);
            onConfirm({ forceInclude: [...back], forceExclude: [...out] });
          }}
        >
          Confirm and build portfolio ({total} {total === 1 ? 'company' : 'companies'})
        </button>
        {onCancel && (
          <button className="btn ghost" onClick={onCancel} disabled={sent}>
            Back to results
          </button>
        )}
        {total === 0 && <small>Keep at least one company to continue.</small>}
      </div>
    </section>
  );
}

function Decision({
  d,
  company,
  tone,
  pressed,
  label,
  disabled,
  onToggle,
}: {
  d: VetDecision;
  company?: Company;
  tone: 'warn' | 'bad';
  pressed: boolean;
  label: string;
  disabled: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pct = percentOfLine(d.score);
  return (
    <div className="decision">
      <div>
        <div className="head">
          <CompanyLogo ticker={d.ticker} name={company?.name} />
          <span className={`chip ${tone}`}>
            <b>{d.ticker}</b>
          </span>
          {company && <b>{company.name}</b>}
          <span>{causeById(d.causeId).label}</span>
          <span className={`meter ${tone === 'bad' ? 'bad' : ''}`} title="The tick marks the close-call level; the full bar is the exclusion line">
            <span style={{ width: `${Math.min(100, pct)}%` }} />
          </span>
          <small>{pct}% of the exclusion line</small>
        </div>
        <p style={{ margin: 0 }}>{d.reason}</p>
        <button className="linkbtn" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Hide evidence' : 'See evidence and sources'}
        </button>
        {open && <Evidence ticker={d.ticker} causeId={d.causeId} />}
      </div>
      <button className="toggle" aria-pressed={pressed} disabled={disabled} onClick={onToggle}>
        {label}
      </button>
    </div>
  );
}
