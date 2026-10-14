import { useEffect, useState } from 'react';
import BrandLogo from '../hud/BrandLogo';
import FestMark from './FestMark';
import Frame from './Frame';
import SolarButton from './SolarButton';
import Star from './Star';
import { BRAND } from '../../config/experience';

/**
 * Site links. `id` is the landing section (scroll-spy), `href` where the link goes.
 * Events, Gallery, Schedule and Rules open their own pages (#/events, #/gallery, #/schedule, #/rules); the rest are landing sections.
 */
export const NAV_LINKS = [
  { label: 'Home', id: 'home' },
  { label: 'Events', id: 'events', href: '#/events' },
  { label: 'About', id: 'about' },
  { label: 'Gallery', id: 'gallery', href: '#/gallery' },
  { label: 'Schedule', id: 'schedule', href: '#/schedule' },
  { label: 'Rules', id: 'rules', href: '#/rules' },
];
export const MENU_LINKS = [...NAV_LINKS, { label: 'Contact', id: 'contact' }];
const hrefOf = (l) => l.href ?? `#${l.id}`;

/** The site's top navigation bar (landing page and gallery page). */
export default function SiteNav({ active, reveal = false }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the menu with Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header data-reveal={reveal || undefined} className="nav-bar fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:h-[4.5rem] sm:px-8">
        <a href="#home" className="flex items-center gap-3" aria-label={`${BRAND.fest} — home`}>
          <FestMark className="h-9 sm:h-10" />
          <span className="font-display text-base font-semibold tracking-[0.22em] sm:text-lg">{BRAND.fest}</span>
        </a>

        <ul className="hidden items-center gap-7 lg:flex xl:gap-9">
          {NAV_LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={hrefOf(l)}
                aria-current={active === l.id ? 'true' : undefined}
                className={`nav-link font-display text-[0.74rem] font-bold tracking-[0.18em] uppercase transition-colors ${
                  active === l.id ? 'is-active text-gold-200' : 'text-white/70 hover:text-white'
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 sm:gap-5">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/[0.03] text-white/85 transition hover:border-gold-400/60 hover:text-gold-200"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 top-0 h-px w-4 bg-current transition ${menuOpen ? 'translate-y-[5.5px] rotate-45' : ''}`} />
              <span className={`absolute left-0 top-[5.5px] h-px w-4 bg-current transition ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`absolute left-0 top-[11px] h-px w-4 bg-current transition ${menuOpen ? '-translate-y-[5.5px] -rotate-45' : ''}`} />
            </span>
          </button>
          <span className="hidden h-8 w-px bg-white/10 sm:block" aria-hidden="true" />
          <BrandLogo className="h-9 sm:h-12" title={BRAND.universityFull} />
        </div>
      </nav>

      <div
        id="site-menu"
        className={`mx-auto max-w-7xl overflow-hidden px-4 transition-all duration-500 sm:px-8 ${
          menuOpen ? 'max-h-[34rem] pb-5 opacity-100' : 'pointer-events-none max-h-0 opacity-0'
        }`}
      >
        <div className="glass relative grid gap-2 rounded-3xl p-3 sm:grid-cols-[1fr_auto] sm:items-center sm:p-4">
          <Frame size="sm" star={false} />
          <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {MENU_LINKS.map((l) => (
              <li key={l.id}>
                <a
                  href={hrefOf(l)}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 font-display text-sm tracking-[0.18em] text-white/85 uppercase transition hover:bg-white/5 hover:text-gold-200"
                >
                  <Star className="h-2 w-2 text-gold-400/70" />
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <SolarButton href="#contact" className="justify-center" onClick={() => setMenuOpen(false)}>
            Register Now
          </SolarButton>
        </div>
      </div>
    </header>
  );
}
