import { useCallback, useEffect, useRef, useState } from 'react';
import SiteNav from '../ui/SiteNav';
import SiteFooter from '../ui/SiteFooter';
import Star from '../ui/Star';
import SolarButton from '../ui/SolarButton';
import { OrnateCorners, OrnateDivider } from '../about/Ornaments';
import { useMountedWhile, usePageShell, useRiseIn } from '../about/usePageShell';
import ContactCard from './ContactCard';
import StarSky from './StarSky';
import StationRing, { MODULES } from './StationRing';
import { BRAND, EVENT, prefersReducedMotion } from '../../config/experience';
import { TEAM_SECTIONS, WEB_LEAD } from '../../config/team';
import { useExperience } from '../../store/useExperience';
import { useViewMore, ViewMoreButton } from '../ui/ViewMore';

const PLACE = 'CHRIST (Deemed to be University) Yeshwanthpur Campus, Bangalore';
const MAP_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(PLACE)}&z=16&output=embed`;
const MAP_DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(PLACE)}`;

/*
 * Each contact is one module of the docking ring: students down the right side
 * (modules 0…5, top to bottom), faculty down the left (modules 11…6, top to bottom),
 * matching the columns beside the station on wide screens.
 */
const people = (key) => TEAM_SECTIONS.find((s) => s.key === key)?.people ?? [];
const GROUPS = [
  { key: 'faculty-core', title: 'Faculty Coordinators', kicker: 'Mission control', side: 'left', people: people('faculty-core'), moduleOf: (j) => MODULES - 1 - j },
  { key: 'student-committee', title: 'Student Core Heads', kicker: 'The command deck', side: 'right', people: people('student-committee'), moduleOf: (j) => j },
];

const formatPhone = (p) => (p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p);
const initials = (name) =>
  name
    .replace(/^(dr|prof|fr|mr|ms|mrs)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

function useMedia(query) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

function SectionHead({ kicker, title, count }) {
  return (
    <div data-rise className="text-center">
      <p className="font-mono text-[0.58rem] tracking-[0.36em] text-gold-300/70 uppercase">{kicker}</p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.1em] uppercase sm:text-3xl">{title}</h2>
      <OrnateDivider className="mx-auto mt-3 w-52 text-gold-300/60" />
      {count != null && <p className="mt-2 font-mono text-[0.55rem] tracking-[0.3em] text-white/40 uppercase">{String(count).padStart(2, '0')} contacts</p>}
    </div>
  );
}

/** A contact card wired to its station module (hover/focus lights both). */
function LinkedCard({ person, j, g, focus, setFocus, compact, className }) {
  const k = g.moduleOf(j);
  return (
    <ContactCard
      person={person}
      index={j}
      compact={compact}
      active={focus?.k === k}
      className={className}
      data-module={k}
      onPointerEnter={() => setFocus({ k, from: 'card', side: g.side })}
      onPointerLeave={() => setFocus(null)}
      onFocus={() => setFocus({ k, from: 'card', side: g.side })}
      onBlur={() => setFocus(null)}
    />
  );
}

/** A group of contacts below the station (narrower screens); phones show three until "View more". */
function ContactGroup({ g, focus, setFocus }) {
  const vm = useViewMore(g.people.length, 3);
  return (
    <section className="mt-[clamp(3rem,7vw,4.5rem)]" aria-label={g.title}>
      <SectionHead kicker={g.kicker} title={g.title} count={g.people.length} />
      <ul className="ct-grid">
        {g.people.map((p, j) => (
          <LinkedCard key={`${p.name}-${j}`} person={p} j={j} g={g} focus={focus} setFocus={setFocus} className={vm.cls(j)} />
        ))}
      </ul>
      <ViewMoreButton {...vm} />
    </section>
  );
}

/** A column of contacts beside the station (wide screens). */
function SideColumn({ g, focus, setFocus }) {
  return (
    <section className={`cts__side cts__side--${g.side}`} aria-label={g.title}>
      <div data-rise className="cts__side-head">
        <p className="font-mono text-[0.55rem] tracking-[0.36em] text-gold-300/70 uppercase">{g.kicker}</p>
        <h2 className="mt-1.5 font-display text-lg font-bold tracking-[0.12em] uppercase">{g.title}</h2>
      </div>
      <ul className="cts__list">
        {g.people.map((p, j) => (
          <LinkedCard key={`${p.name}-${j}`} person={p} j={j} g={g} focus={focus} setFocus={setFocus} compact />
        ))}
      </ul>
    </section>
  );
}

/** The website contact, opened from the ring's hub; × closes it. */
function WebCrewCard({ open, onClose }) {
  const p = WEB_LEAD;
  const closeRef = useRef(null);
  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);
  return (
    <article className={`cts-core ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open || undefined} aria-label="Website contact">
      <span className="cts-core__ring" aria-hidden="true" />
      <button ref={closeRef} type="button" className="cts-core__close" onClick={onClose} aria-label="Close the website contact">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      </button>
      <p className="cts-core__kicker">
        <span className="cts-core__led" aria-hidden="true" /> Website &amp; tech support
      </p>
      <span className="cts-core__medal">{p.photo ? <img src={p.photo} alt={p.name} loading="lazy" decoding="async" /> : <b>{initials(p.name)}</b>}</span>
      <h3 className="cts-core__name">{p.name}</h3>
      <p className="cts-core__role">{p.role}</p>
      <p className="cts-core__note">Anything about this website — a broken link, a bug or an idea? Reach out.</p>
      <div className="cts-core__actions">
        {p.phone && (
          <a href={`tel:+91${p.phone}`} className="cts-core__btn" aria-label={`Call ${p.name}, ${formatPhone(p.phone)}`} title={formatPhone(p.phone)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6.6 3.5 8.3 7 6.8 8.4a9.6 9.6 0 0 0 4.8 4.8l1.4-1.5 3.5 1.7-.6 2.7c-.1.5-.6.9-1.1.9A13 13 0 0 1 2.9 4.1c0-.5.4-1 .9-1.1l2.8-.5Z" />
            </svg>
            <span>Call</span>
          </a>
        )}
        {p.email && (
          <a href={`mailto:${p.email}`} className="cts-core__btn" aria-label={`Email ${p.name}`} title={p.email}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 5h14v10H3Z M3 5l7 6 7-6" />
            </svg>
            <span>Email</span>
          </a>
        )}
        {p.linkedin && (
          <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="cts-core__btn" aria-label={`${p.name} on LinkedIn`}>
            <svg viewBox="0 0 20 20" strokeLinecap="round" aria-hidden="true">
              <path d="M3 3h14v14H3Z M6.5 9v5 M6.5 6.2v.1 M9.5 14V9 M9.5 11.2c0-1.4 1-2.2 2.2-2.2s2 .8 2 2.2V14" />
            </svg>
            <span>LinkedIn</span>
          </a>
        )}
      </div>
    </article>
  );
}

function ContactView({ open, onGone }) {
  const rootRef = usePageShell({
    open,
    onGone,
    leaveHash: '#home',
    onEnter: (tl) => {
      tl.fromTo(
        rootRef.current.querySelectorAll('[data-hero]'),
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, clearProps: 'transform' },
        0.25,
      );
    },
  });
  const quality = useExperience((s) => s.quality);
  const wide = useMedia('(min-width: 1200px)');
  // re-scan when the layout swaps between side columns and groups below
  useRiseIn(rootRef, [wide]);
  const [focus, setFocusState] = useState(null);
  const [inView, setInView] = useState(false);
  const stageRef = useRef(null);
  const wrapRef = useRef(null);
  const lineRef = useRef(null);
  const st = useRef({
    angle: 0, vel: 0, build: 0, assemble: false, reduced: prefersReducedMotion(), dragging: false,
    focus: null, focusFrom: null, hover: null, px: 0, py: 0, tx: 0, ty: 0, points: [],
  });

  const setFocus = useCallback((f) => {
    st.current.focus = f?.k ?? null;
    st.current.focusFrom = f?.from ?? null;
    st.current.focusSide = f?.side ?? null;
    if (!f) st.current.targetY = null;
    setFocusState(f);
  }, []);

  // The website contact: hidden until the hub is clicked.
  const [coreOpen, setCoreOpen] = useState(false);
  const toggleCore = useCallback(() => {
    setCoreOpen((o) => {
      st.current.coreOpen = !o;
      return !o;
    });
  }, []);
  const closeCore = useCallback(() => {
    st.current.coreOpen = false;
    setCoreOpen(false);
  }, []);

  // Modules: hover lights the card; a tap/click brings the card into view and pings it.
  const onOver = useCallback(
    (k) => {
      st.current.hover = k;
      setFocus({ k, from: 'module' });
    },
    [setFocus],
  );
  const onOut = useCallback(
    (k) => {
      if (st.current.hover === k) st.current.hover = null;
      if (st.current.focus === k && st.current.focusFrom === 'module') setFocus(null);
    },
    [setFocus],
  );
  const onPick = useCallback(
    (k) => {
      const card = rootRef.current?.querySelector(`[data-module="${k}"]`);
      if (!card) return;
      const r = card.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight) card.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
      card.classList.remove('is-ping');
      void card.offsetWidth;
      card.classList.add('is-ping');
      setFocus({ k, from: 'module' });
    },
    [rootRef, setFocus],
  );

  // Run the 3D scene only while the station is on screen; assemble it the first time.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.isIntersecting) st.current.assemble = true;
      },
      { root: rootRef.current, threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootRef]);

  // Gold link line from the focused card to its module (wide screens).
  useEffect(() => {
    const line = lineRef.current;
    if (!line) return undefined;
    if (!wide || focus == null) {
      line.classList.remove('is-on');
      return undefined;
    }
    let raf = 0;
    const tick = () => {
      const wrap = wrapRef.current;
      const card = wrap?.querySelector(`.cts__side [data-module="${focus.k}"]`);
      const canvas = wrap?.querySelector('.cts__canvas');
      const pt = st.current.points[focus.k];
      if (wrap && card && canvas && pt) {
        const w = wrap.getBoundingClientRect();
        const c = card.getBoundingClientRect();
        const v = canvas.getBoundingClientRect();
        const left = c.left + c.width / 2 < v.left + v.width / 2;
        const ax = (left ? c.right : c.left) - w.left;
        const ay = c.top + c.height / 2 - w.top;
        // the ring turns the module level with the card (StationRing reads this)
        st.current.targetY = c.top + c.height / 2 - v.top;
        const bx = v.left - w.left + pt[0];
        const by = v.top - w.top + pt[1];
        const ex = ax + (left ? 22 : -22);
        // a circuit-trace: across from the card, up/down only if the module can't reach the card's height, then across into the module
        line.querySelector('path').setAttribute('d', `M${ax.toFixed(1)} ${ay.toFixed(1)} H${ex.toFixed(1)} V${by.toFixed(1)} H${bx.toFixed(1)}`);
        line.querySelector('circle').setAttribute('cx', bx.toFixed(1));
        line.querySelector('circle').setAttribute('cy', by.toFixed(1));
        line.classList.add('is-on');
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wide, focus]);

  return (
    <div ref={rootRef} className="space-page ct-page fixed inset-0 z-40 overflow-y-auto overflow-x-hidden overscroll-contain text-[#f4f1ea]" data-no-orbit>
      <StarSky scrollRef={rootRef} />
      <SiteNav active="contact" />

      <main className="relative z-10 mx-auto max-w-[84rem] px-5 pb-16 pt-[calc(env(safe-area-inset-top)+6.5rem)] sm:px-8 sm:pt-32">
        {/* ---------- Hero ---------- */}
        <header className="flex flex-col items-center text-center">
          <p data-hero className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
            <Star className="h-2 w-2 text-gold-400/70" />
            Open a channel
            <Star className="h-2 w-2 text-gold-400/70" />
          </p>
          <h1 data-hero className="title-cosmic mt-4 font-display text-[clamp(2.4rem,7vw,4.8rem)] font-bold leading-none tracking-[0.1em] uppercase">
            Contact
          </h1>
          <span data-hero className="mt-5 block">
            <OrnateDivider className="w-64 text-gold-300/70" />
          </span>
          <p data-hero className="mt-5 max-w-xl text-[0.98rem] leading-relaxed text-white/65">
            Questions about events, registration or the day itself? Reach the {BRAND.fest} crew directly — or ask CB-27, our chat droid, any time.
          </p>
          <div data-hero className="mt-7 flex flex-wrap justify-center gap-3">
            <SolarButton variant="ghost" onClick={() => window.dispatchEvent(new Event('cubyc:open-chat'))}>
              Ask CB-27
            </SolarButton>
            <SolarButton
              href="#ct-map"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                rootRef.current?.querySelector('#ct-map')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Find the campus
            </SolarButton>
          </div>
        </header>

        {/* ---------- The docking ring: one module per contact, the website contact at its heart ---------- */}
        <section className="cts-section" aria-label="Contacts">
          <SectionHead kicker="The docking ring" title="Mission crew" />
          <p data-rise className="cts-hint">
            <span className="hidden sm:inline">Drag to turn the ring · hover a module to find its crew · click the hub for website help</span>
            <span className="sm:hidden">Swipe to turn · tap a module · tap the hub for website help</span>
          </p>

          <div ref={wrapRef} className={`cts ${wide ? 'is-wide' : ''}`}>
            {wide && <SideColumn g={GROUPS[0]} focus={focus} setFocus={setFocus} />}

            <div ref={stageRef} className="cts__stage" data-rise>
              <span className="cts__halo" aria-hidden="true" />
              <StationRing st={st} onOver={onOver} onOut={onOut} onPick={onPick} onHub={toggleCore} active={inView && open} quality={quality} />
              <WebCrewCard open={coreOpen} onClose={closeCore} />
            </div>

            {wide && <SideColumn g={GROUPS[1]} focus={focus} setFocus={setFocus} />}

            <svg ref={lineRef} className="cts__link" aria-hidden="true">
              <path d="" />
              <circle r="9" />
            </svg>
          </div>

          {!wide && GROUPS.map((g) => <ContactGroup key={g.key} g={g} focus={focus} setFocus={setFocus} />)}
        </section>

        {/* ---------- Map ---------- */}
        <section id="ct-map" className="mx-auto mt-[clamp(4rem,9vw,6.5rem)] max-w-6xl scroll-mt-24" aria-label="Campus map">
          <SectionHead kicker="Find the launch pad" title="CHRIST (Deemed to be University) · Yeshwanthpur" />
          <div className="ct-map-wrap">
            <div data-rise className="ct-map">
              <OrnateCorners />
              <div className="ct-map__frame">
                <iframe title={`Map: ${PLACE}`} src={MAP_EMBED} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
                <span className="ct-map__pin" aria-hidden="true" />
              </div>
            </div>

            <aside data-rise className="ct-venue" style={{ '--i': 1 }}>
              <OrnateCorners />
              <span className="ct-venue__icon" aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <path d="M10 17s-5.5-5-5.5-9a5.5 5.5 0 0 1 11 0c0 4-5.5 9-5.5 9Z M10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                </svg>
              </span>
              <h3 className="ct-venue__title">The venue</h3>
              <OrnateDivider className="mx-auto my-3 w-36 text-gold-300/50" />
              <p className="ct-venue__line">
                <b>{BRAND.universityFull}</b>
                {BRAND.campus}, Bangalore, Karnataka
              </p>
              <dl className="ct-venue__facts">
                <div>
                  <dt>Dates</dt>
                  <dd>{EVENT.dateLabel}</dd>
                </div>
                <div>
                  <dt>Entry</dt>
                  <dd>Valid college ID required</dd>
                </div>
              </dl>
              <div className="ct-venue__btns">
                <SolarButton href={MAP_DIRECTIONS} target="_blank" rel="noopener noreferrer">
                  Get directions
                </SolarButton>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter map={false} />
    </div>
  );
}

/** The Contact page (#/contact). */
export default function ContactPage() {
  const open = useExperience((s) => s.contactOpen);
  const [mounted, onGone] = useMountedWhile(open);
  if (!mounted) return null;
  return <ContactView open={open} onGone={onGone} />;
}
