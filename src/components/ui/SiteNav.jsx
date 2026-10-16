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
 * The menu button (small screens), after a celestial dial: a blue orb inside two
 * gold crescents, gold blades radiating from them and a filigree stem below.
 * Opening turns the dial: the blades sweep round and the crescents close into a ring.
 */
function DialButton({ open, onClick }) {
  return (
    <button type="button" className={`nv-dial ${open ? 'is-open' : ''}`} onClick={onClick} aria-expanded={open} aria-controls="site-menu" aria-label={open ? 'Close menu' : 'Open menu'}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <radialGradient id="nv-orb" cx="38%" cy="32%" r="70%">
            <stop offset="0" stopColor="#bfe0ff" />
            <stop offset="0.45" stopColor="#4f86c8" />
            <stop offset="1" stopColor="#1b355f" />
          </radialGradient>
          <linearGradient id="nv-blade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff2c8" />
            <stop offset="0.6" stopColor="#e9b44c" />
            <stop offset="1" stopColor="#b8772a" />
          </linearGradient>
        </defs>
        {/* Blades radiating from the left half (they sweep round when open) */}
        <g className="nv-dial__blades">
          {[150, 180, 210, 120, 240].map((a, i) => (
            <path key={a} d={`M44 32 L${i < 3 ? 61 : 57} 30.4 L${i < 3 ? 63.5 : 59} 32 L${i < 3 ? 61 : 57} 33.6 Z`} fill="url(#nv-blade)" stroke="#7a4a1a" strokeWidth="0.4" transform={`rotate(${a} 32 32)`} />
          ))}
        </g>
        {/* Two crescents opening to the right */}
        <g className="nv-dial__arcs" fill="none" strokeLinecap="round">
          <path className="nv-dial__arc-outer" d="M43.3 20.7 A16 16 0 1 0 43.3 43.3" stroke="#c4542b" strokeWidth="3.2" />
          <path className="nv-dial__arc-inner" d="M39.8 24.2 A11 11 0 1 0 39.8 39.8" stroke="#f3d9a4" strokeWidth="1.6" />
        </g>
        {/* Studs on the crescent */}
        <g fill="#f7e7c4" className="nv-dial__studs">
          <circle cx="16" cy="32" r="1.4" />
          <circle cx="20.7" cy="20.7" r="1.1" />
          <circle cx="20.7" cy="43.3" r="1.1" />
        </g>
        {/* The orb */}
        <circle cx="32" cy="32" r="7.2" fill="url(#nv-orb)" className="nv-dial__orb" />
        <circle cx="29.6" cy="29.4" r="2" fill="#ffffff" opacity="0.55" />
        {/* Close mark over the orb */}
        <g className="nv-dial__x" stroke="#fff6e0" strokeWidth="1.8" strokeLinecap="round">
          <path d="M28.6 28.6 35.4 35.4 M35.4 28.6 28.6 35.4" />
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
