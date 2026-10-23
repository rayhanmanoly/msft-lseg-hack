'use client';

import { useState, type ReactNode } from 'react';

/** A wrapping list that shows the first few items and a "Show all" toggle, so hundreds of companies stay readable. */
export function ChipList<T>({
  items,
  render,
  limit = 14,
  label = 'companies',
}: {
  items: T[];
  render: (item: T) => ReactNode;
  limit?: number;
  label?: string;
}) {
  const [all, setAll] = useState(false);
  return (
    <>
      <div className="chips">{(all ? items : items.slice(0, limit)).map(render)}</div>
      {items.length > limit && (
        <button className="linkbtn" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${items.length} ${label}`}
        </button>
      )}
    </>
  );
}
