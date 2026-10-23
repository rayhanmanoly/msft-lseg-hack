import type { Company, ScreenApproval, ScreenResult, VetConfirmation, VetResult } from '@/lib/schemas';
import { ChipList } from './ChipList';
import { CompanyLogo } from './CompanyLogo';

type Props = {
  screen: ScreenResult;
  screenApproval?: ScreenApproval;
  vet: VetResult;
  vetConfirmation?: VetConfirmation;
  /** Tickers actually in the portfolio. */
  held: string[];
  companies: Record<string, Company>;
};

/**
 * How the list of companies shrank to the portfolio: four numbered stages showing what each one removed,
 * then every company under the outcome it ended up with. Real session data only.
 */
export function DecisionTrail({ screen, screenApproval, vet, vetConfirmation, held, companies }: Props) {
  const all = screen.buckets.flatMap((b) => b.tickers);

  const kept = new Set(screen.buckets.filter((b) => b.action === 'keep').flatMap((b) => b.tickers));
  screenApproval?.forceKeep.forEach((t) => kept.add(t));
  screenApproval?.forceExclude.forEach((t) => kept.delete(t));

  const ethicsPass = new Set([...vet.passed, ...vet.borderline.map((d) => d.ticker), ...(vetConfirmation?.forceInclude ?? [])]);
  vetConfirmation?.forceExclude.forEach((t) => ethicsPass.delete(t));

  const inPortfolio = new Set(held);
  const passedEthics = [...kept].filter((t) => ethicsPass.has(t)).length;

  // Where each company ended up. A company is counted once, in the first outcome that applies.
  const byRules = all.filter((t) => !kept.has(t) && !inPortfolio.has(t));
  const unratedSet = new Set(vet.unrated);
  const byUnrated = all.filter((t) => kept.has(t) && unratedSet.has(t) && !ethicsPass.has(t) && !inPortfolio.has(t));
  const byEthics = all.filter((t) => kept.has(t) && !ethicsPass.has(t) && !unratedSet.has(t) && !inPortfolio.has(t));
  const left = all.filter((t) => !inPortfolio.has(t) && !byRules.includes(t) && !byEthics.includes(t) && !byUnrated.includes(t));

  // The client's own calls, shown as a tag on the company.
  const calls = new Map<string, string>();
  screenApproval?.forceKeep.forEach((t) => calls.set(t, 'you kept it'));
  screenApproval?.forceExclude.forEach((t) => calls.set(t, 'you removed it'));
  vetConfirmation?.forceExclude.forEach((t) => calls.set(t, 'you excluded it'));
  vetConfirmation?.forceInclude.forEach((t) => calls.set(t, 'you included it'));

  const stages = [
    { n: all.length, label: 'Companies considered', drop: 0, unrated: 0 },
    { n: kept.size, label: 'Passed your rules', drop: all.length - kept.size, unrated: 0 },
    { n: passedEthics, label: 'Passed the ethics check', drop: Math.max(0, kept.size - passedEthics - byUnrated.length), unrated: byUnrated.length },
    { n: held.length, label: 'In your portfolio', drop: 0, unrated: 0 },
  ];

  const groups = [
    { key: 'in', title: 'In your portfolio', note: 'These are what the money is invested in.', list: [...inPortfolio] },
    { key: 'rules', title: 'Removed by your rules', note: 'They break a sector or activity rule you set.', list: byRules },
    { key: 'ethics', title: 'Removed by the ethics check', note: 'They failed on a cause you care about.', list: byEthics },
    { key: 'unrated', title: 'Not rated: limited information', note: 'Not enough evidence yet, so Ethos cannot call them clean. They are left out unless you include them.', list: byUnrated },
    { key: 'left', title: 'Left out of the portfolio', note: 'They passed, but were not chosen.', list: left },
  ].filter((g) => g.list.length > 0);

  return (
    <div className="card">
      <h3>How we got here</h3>
      <p className="muted" style={{ marginBottom: '.75rem' }}>
        Ethos started with {all.length} companies and ended with {held.length}. This is what happened to each one.
      </p>

      <ol className="pipeline">
        {stages.map((s, i) => (
          <li key={s.label} className="stage">
            <span className="step-no">{i + 1}</span>
            <b className="big">{s.n}</b>
            <span>{s.label}</span>
            {s.drop > 0 && <span className="drop">{s.drop} removed</span>}
            {s.unrated > 0 && <span className="drop warn">{s.unrated} not rated</span>}
          </li>
        ))}
      </ol>

      {groups.map((g) => (
        <div key={g.key} className={`outcome ${g.key}`}>
          <h4>
            {g.title} <span className="count">{g.list.length}</span>
          </h4>
          <p className="muted">{g.note}</p>
          <ChipList
            items={g.list}
            limit={14}
            render={(t) => (
              <span key={t} className="pill-co">
                <CompanyLogo ticker={t} name={companies[t]?.name} />
                {companies[t]?.name ?? t}
                {calls.has(t) && <em>{calls.get(t)}</em>}
              </span>
            )}
          />
        </div>
      ))}

      {calls.size === 0 && <p className="muted" style={{ margin: '1rem 0 0' }}>You accepted the recommendation at both checkpoints.</p>}
    </div>
  );
}
