import { useEffect, useRef } from 'react';
import SiteNav from '../ui/SiteNav';
import SiteFooter from '../ui/SiteFooter';
import Star from '../ui/Star';
import SolarButton from '../ui/SolarButton';
import SpaceBackdrop from '../about/SpaceBackdrop';
import Ufo from './Ufo';
import { OrnateDivider } from '../about/Ornaments';
import { useMountedWhile, usePageShell, useRiseIn } from '../about/usePageShell';
import { SPONSOR_CONTACT, SPONSOR_TIERS } from '../../config/sponsors';
import { BRAND, EVENT, prefersReducedMotion } from '../../config/experience';
import { useExperience } from '../../store/useExperience';

/** Card tilt + light that follow the pointer. */
const tilt = (e) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--rx', `${((y - 0.5) * -7).toFixed(2)}deg`);
  el.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
  el.style.setProperty('--lx', `${(x * 100).toFixed(1)}%`);
  el.style.setProperty('--ly', `${(y * 100).toFixed(1)}%`);
};
const untilt = (e) => {
  e.currentTarget.style.setProperty('--rx', '0deg');
  e.currentTarget.style.setProperty('--ry', '0deg');
};

function SponsorCard({ sponsor, tier, index }) {
  const empty = !sponsor.name;
  const Tag = sponsor.url ? 'a' : 'div';
  return (
    <li className="spc-wrap" data-rise style={{ '--i': index }}>
      <Tag
        className={`spc spc--${tier.tone} ${empty ? 'is-open' : ''}`}
        onPointerMove={tilt}
        onPointerLeave={untilt}
        {...(sponsor.url ? { href: sponsor.url, target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        <span className="spc__foil" aria-hidden="true" />
        <span className="spc__light" aria-hidden="true" />
        <span className="spc__frame" aria-hidden="true" />
        <span className="spc__tier">{tier.title.replace(/s$/, '')}</span>
        <div className="spc__brand">
          {empty ? (
            <>
              <span className="spc__slot" aria-hidden="true">
                <Star className="h-4 w-4" />
              </span>
              <b className="spc__name">Your brand here</b>
            </>
          ) : sponsor.logo ? (
            <img src={sponsor.logo} alt={sponsor.name} className="spc__logo" loading="lazy" />
          ) : (
            <b className="spc__name">{sponsor.name}</b>
          )}
        </div>
        <p className="spc__tag">{empty ? `Claim the ${tier.title.replace(/s$/, '').toLowerCase()} spot` : sponsor.tagline ?? ''}</p>
      </Tag>
    </li>
  );
}

function SponsorsView({ open, onGone }) {
  const rootRef = usePageShell({
    open,
    onGone,
    leaveHash: '#home',
    onEnter: (tl) => {
      const root = rootRef.current;
      tl.fromTo(
        root.querySelectorAll('[data-hero]'),
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, clearProps: 'transform' },
        0.3,
      );
    },
  });
  useRiseIn(rootRef);

  // Parallax: the page's scroll position drives CSS variables (one write per frame).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return undefined;
    let raf = 0;
    let cur = root.scrollTop;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
      last = now;
      cur += (root.scrollTop - cur) * (1 - Math.exp(-dt * 9));
      const vh = window.innerHeight;
      root.style.setProperty('--sy', `${cur.toFixed(1)}px`);
      root.style.setProperty('--hp', Math.min(cur / vh, 1).toFixed(4));
      raf = Math.abs(root.scrollTop - cur) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const onScroll = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [rootRef]);

  const toTiers = () => {
    const root = rootRef.current;
    const el = root?.querySelector('#sp-tiers');
    if (el) root.scrollTo({ top: el.offsetTop - 40, behavior: 'smooth' });
  };

  return (
    <div ref={rootRef} className="space-page sp-page fixed inset-0 z-40 overflow-y-auto overflow-x-hidden overscroll-contain text-[#f4f1ea]" data-no-orbit>
      <SpaceBackdrop />
      {/* Parallax star layers (each drifts at its own speed) */}
      <div className="sp-stars sp-stars--far" aria-hidden="true" />
      <div className="sp-stars sp-stars--mid" aria-hidden="true" />
      <div className="sp-stars sp-stars--near" aria-hidden="true" />
      <SiteNav active="sponsors" />
      {/* A roaming UFO above the page content (under the navbar); try to touch it */}
      <Ufo />

      <main className="relative z-10">
        {/* ---------- Hero: the satellite ---------- */}
        <section className="sp-hero">
          <div className="sp-hero__copy">
            <p data-hero className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
              <Star className="h-2 w-2 text-gold-400/70" />
              Incoming transmission · {BRAND.fest}
              <Star className="h-2 w-2 text-gold-400/70" />
            </p>
            <h1 data-hero className="title-cosmic mt-4 font-display text-[clamp(2.4rem,7vw,5rem)] font-bold leading-none tracking-[0.1em] uppercase">
              Our Sponsors
            </h1>
            <span data-hero className="mt-5 block">
              <OrnateDivider className="mx-auto w-64 text-gold-300/70" />
            </span>
            <p data-hero className="mx-auto mt-5 max-w-xl text-[0.98rem] leading-relaxed text-white/65">
              The brands that power the orbit. Their signal reaches every one of the {BRAND.fest} crew — across ten worlds, twenty-seven events and two days,{' '}
              {EVENT.dateLabel}.
            </p>
            <button data-hero type="button" onClick={toTiers} className="sp-cue">
              <span>Receive the transmission</span>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </section>

        {/* ---------- Tiers ---------- */}
        <div id="sp-tiers" className="sp-tiers">
          {SPONSOR_TIERS.map((tier) => (
            <section key={tier.key} className={`sp-tier sp-tier--${tier.tone}`} aria-label={tier.title}>
              <div data-rise className="sp-tier__head">
                <p className="font-mono text-[0.58rem] tracking-[0.36em] text-gold-300/70 uppercase">{tier.kicker}</p>
                <h2 className="sp-tier__title">{tier.title}</h2>
                <OrnateDivider className="mx-auto mt-3 w-52 text-gold-300/60" />
              </div>
              <ul className="sp-grid" data-count={tier.sponsors.length}>
                {tier.sponsors.map((sp, i) => (
                  <SponsorCard key={`${tier.key}-${i}`} sponsor={sp} tier={tier} index={i} />
                ))}
              </ul>
            </section>
          ))}

          {/* ---------- Become a sponsor ---------- */}
          <section data-rise className="sp-join">
            <span className="sp-join__orbit" aria-hidden="true" />
            <p className="font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/80 uppercase">Open channel</p>
            <h2 className="mt-3 font-display text-[clamp(1.6rem,4vw,2.6rem)] font-bold tracking-[0.08em] uppercase">
              Put your brand <span className="text-gold-gradient">in orbit</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/65">{SPONSOR_CONTACT.note}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <SolarButton href={SPONSOR_CONTACT.email ? `mailto:${SPONSOR_CONTACT.email}` : '#/contact'}>Become a sponsor</SolarButton>
              <SolarButton href="#/contact" variant="ghost">
                Contact the team
              </SolarButton>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** The Sponsors page (#/sponsors). */
export default function SponsorsPage() {
  const open = useExperience((s) => s.sponsorsOpen);
  const [mounted, onGone] = useMountedWhile(open);
  if (!mounted) return null;
  return <SponsorsView open={open} onGone={onGone} />;
}
