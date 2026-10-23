'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EthosMark } from './flow/EthosMark';

const LINKS = [
  { href: '/', label: 'Home', anchor: false },
  { href: '/#how', label: 'How it works', anchor: true },
  { href: '/#built-for', label: "Who it's for", anchor: true },
  { href: '/about', label: 'About', anchor: false },
];

/** Sticky site navigation, shared by every page. */
export function SiteNav() {
  const path = usePathname();
  return (
    <header className="sitenav">
      <div className="sitenav-inner">
        <Link href="/" className="nav-brand" aria-label="Ethos home">
          <EthosMark size={34} />
          <span>Ethos</span>
        </Link>
        <nav aria-label="Main">
          {LINKS.map(({ href, label, anchor }) => {
            const active = !anchor && path === href;
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link${anchor ? ' anchor' : ''}${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        {path !== '/' && (
          <Link href="/" className="btn small">
            Try Ethos
          </Link>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="foot">
      <b>Ethos</b> · Invest with purpose. Grow with confidence.
      <br />
      An educational hackathon prototype. Ethical assessments use a growing evidence base and portfolio weights are a placeholder. Not financial advice.
    </footer>
  );
}
