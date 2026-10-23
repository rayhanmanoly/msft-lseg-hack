'use client';

import { useEffect, useState } from 'react';
import type { CauseId, EthicsRecord } from '@/lib/schemas';

/** The cited incidents behind one decision. Quotes are verified verbatim against the source in the cache builder. */
export function Evidence({ ticker, causeId }: { ticker: string; causeId: CauseId }) {
  const [record, setRecord] = useState<EthicsRecord | null | undefined>(undefined); // undefined = loading, null = none

  useEffect(() => {
    fetch(`/api/ethics/${ticker}`)
      .then((r) => (r.ok ? (r.json() as Promise<EthicsRecord>) : null))
      .then(setRecord)
      .catch(() => setRecord(null));
  }, [ticker]);

  if (record === undefined) return <p className="muted">Loading evidence…</p>;
  const incidents = record?.causes[causeId]?.incidents ?? [];
  if (!record || incidents.length === 0) return <p className="muted">No evidence record is available for this cause.</p>;

  return (
    <div className="evidence">
      {record.coverage !== 'full' && <p className="muted">Evidence coverage: {record.coverage}. Treat this as limited information.</p>}
      {incidents.map((i, n) => (
        <div key={n} className="incident">
          <p>
            <b>{i.year}</b> <span className={`badge ${i.confirmed ? 'exclude' : 'warn'}`}>{i.confirmed ? 'Confirmed' : 'Alleged'}</span>{' '}
            <small>severity {i.severity} of 5 · matters {i.relativeScale} of 5 to this company · {Math.round(i.remediation * 100)}% remedied</small>
            <br />
            {i.summary}
          </p>
          {i.sources.slice(0, 2).map((s) => (
            <blockquote key={s.quote}>
              “{s.quote}”
              <cite>
                {' '}
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>
              </cite>
            </blockquote>
          ))}
        </div>
      ))}
    </div>
  );
}
