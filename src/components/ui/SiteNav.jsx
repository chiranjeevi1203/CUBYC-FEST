import { useEffect, useState } from 'react';
import BrandLogo from '../hud/BrandLogo';
import FestMark from './FestMark';
import { BRAND } from '../../config/experience';

/**
 * Site links. `id` is the landing section (scroll-spy), `href` where the link goes.
 * Events, About, Gallery, Schedule, Rules, Sponsors and Contact open their own pages; Home is the landing hero.
 */
export const NAV_LINKS = [
  { label: 'Home', id: 'home' },
  { label: 'Events', id: 'events', href: '#/events' },
  { label: 'About', id: 'about', href: '#/about' },
  { label: 'Gallery', id: 'gallery', href: '#/gallery' },
  { label: 'Schedule', id: 'schedule', href: '#/schedule' },
  { label: 'Rules', id: 'rules', href: '#/rules' },
  { label: 'Sponsors', id: 'sponsors', href: '#/sponsors' },
  { label: 'Contact', id: 'contact', href: '#/contact' },
];
export const MENU_LINKS = NAV_LINKS;
const hrefOf = (l) => l.href ?? `#${l.id}`;

/** Four-pointed star in a ring — the emblem on each menu plate. */
function PlateStar() {
  return (
    <svg viewBox="0 0 24 24" className="nv-plate__star" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <path d="M12 3.5 13.6 10.4 20.5 12 13.6 13.6 12 20.5 10.4 13.6 3.5 12 10.4 10.4Z" fill="currentColor" />
    </svg>
  );
}

/** Faint orbit arcs drawn into the right end of a plate. */
function PlateOrbits() {
  return (
    <svg viewBox="0 0 60 30" className="nv-plate__orbits" aria-hidden="true" preserveAspectRatio="none">
      <path d="M2 15h30" />
      <circle cx="44" cy="15" r="11" />
      <circle cx="44" cy="15" r="6" />
      <circle cx="55" cy="15" r="1.6" className="is-dot" />
    </svg>
  );
}

/**
 * The star's points: [angle (deg, 0 = up, clockwise), length, half-width, where the width peaks].
 * A tall north–south axis, shorter east–west, four small diagonals — like a guiding star.
 */
const STAR_RAYS = [
  [0, 29, 3.3, 5.5],
  [180, 25, 3.3, 5.5],
  [90, 21, 3.1, 5],
  [270, 21, 3.1, 5],
  [45, 13, 2.3, 3.8],
  [135, 13, 2.3, 3.8],
  [225, 13, 2.3, 3.8],
  [315, 13, 2.3, 3.8],
];
const pt = (deg, r, side = 0) => {
  const a = (deg * Math.PI) / 180;
  const x = 32 + Math.sin(a) * r + Math.cos(a) * side;
  const y = 32 - Math.cos(a) * r + Math.sin(a) * side;
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
};
// Each point is two facets — a lit half and a shaded half — so the star reads as cut crystal.
const STAR_FACETS = STAR_RAYS.flatMap(([deg, len, w, at]) => [
  { d: `M32 32 L${pt(deg, at, -w)} L${pt(deg, len)} Z`, lit: true },
  { d: `M32 32 L${pt(deg, at, w)} L${pt(deg, len)} Z`, lit: false },
]);

/**
 * The menu button (small screens): a light-blue, eight-pointed crystal star with a
 * glowing heart. Opening turns the star and dims it, and a × appears over its heart.
 */
function DialButton({ open, onClick }) {
  return (
    <button type="button" className={`nv-dial ${open ? 'is-open' : ''}`} onClick={onClick} aria-expanded={open} aria-controls="site-menu" aria-label={open ? 'Close menu' : 'Open menu'}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="nv-star-lit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f4f9ff" />
            <stop offset="1" stopColor="#a9cbff" />
          </linearGradient>
          <linearGradient id="nv-star-shade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8db6f5" />
            <stop offset="1" stopColor="#4a78cc" />
          </linearGradient>
          <radialGradient id="nv-star-core">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.35" stopColor="#dcebff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#7fa9ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="15" fill="url(#nv-star-core)" className="nv-dial__halo" />
        <g className="nv-dial__star">
          {STAR_FACETS.map((f) => (
            <path key={f.d} d={f.d} fill={f.lit ? 'url(#nv-star-lit)' : 'url(#nv-star-shade)'} />
          ))}
          <circle cx="32" cy="32" r="3.2" fill="#ffffff" />
        </g>
        {/* Close mark over the star's heart */}
        <g className="nv-dial__x" stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
          <path d="M27.8 27.8 36.2 36.2 M36.2 27.8 27.8 36.2" />
        </g>
      </svg>
    </button>
  );
}

/** The site's top navigation bar: one line on wide screens; a dial + full menu on small ones. */
export default function SiteNav({ active, reveal = false }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Escape closes; the page under the open menu doesn't scroll.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('nav-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('nav-open');
    };
  }, [menuOpen]);

  // Close if the screen grows past the breakpoint.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1180px)');
    const onChange = () => mq.matches && setMenuOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const close = () => setMenuOpen(false);

  return (
    <header data-reveal={reveal || undefined} className={`nav-bar nv fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] ${menuOpen ? 'is-menu' : ''}`}>
      <nav className="nv__row" aria-label="Main">
        <a href="#home" className="nv__brand" aria-label={`${BRAND.fest} — home`} onClick={close}>
          <FestMark className="h-9 sm:h-10" />
          <span className="font-display text-base font-semibold tracking-[0.22em] sm:text-lg">{BRAND.fest}</span>
        </a>

        {/* Wide screens: every link on one line */}
        <ul className="nv__links">
          {NAV_LINKS.map((l) => (
            <li key={l.id}>
              <a href={hrefOf(l)} aria-current={active === l.id ? 'true' : undefined} className={`nv-plate nv-plate--bar ${active === l.id ? 'is-active' : ''}`}>
                <PlateStar />
                <span className="nv-plate__label">{l.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="nv__end">
          <a href="#contact" className="nv-cta" onClick={close}>
            <span>Register</span>
          </a>
          <span className="nv__sep" aria-hidden="true" />
          <BrandLogo className="h-9 sm:h-12" title={BRAND.universityFull} />
          <DialButton open={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
        </div>
      </nav>

      {/* Small screens: the full menu of plates */}
      <div id="site-menu" className="nv-menu" aria-hidden={!menuOpen} inert={!menuOpen || undefined} onClick={(e) => e.target === e.currentTarget && close()}>
        <div className="nv-menu__inner">
          <p className="nv-menu__kicker">
            <span /> Navigate the orbit <span />
          </p>
          <ul className="nv-menu__list">
            {NAV_LINKS.map((l, i) => (
              <li key={l.id} style={{ '--i': i }}>
                <a href={hrefOf(l)} onClick={close} aria-current={active === l.id ? 'true' : undefined} className={`nv-plate nv-plate--menu ${active === l.id ? 'is-active' : ''}`}>
                  <PlateStar />
                  <span className="nv-plate__label">{l.label}</span>
                  <PlateOrbits />
                </a>
              </li>
            ))}
          </ul>
          <a href="#contact" className="nv-cta nv-cta--menu" onClick={close} style={{ '--i': NAV_LINKS.length }}>
            <span>Register</span>
          </a>
        </div>
      </div>
    </header>
  );
}
