import { useEffect, useRef, useState } from 'react';
import Gallery from '../components/Gallery';
import ScheduleTeaser from '../components/schedule/ScheduleTeaser';
import RulesTeaser from '../components/rules/RulesTeaser';
import FestMark from '../components/ui/FestMark';
import EventCountdown from '../components/ui/EventCountdown';
import SolarButton from '../components/ui/SolarButton';
import Star from '../components/ui/Star';
import BodyIcon from '../components/ui/BodyIcon';
import Frame from '../components/ui/Frame';
import SiteNav, { MENU_LINKS } from '../components/ui/SiteNav';
import SiteFooter from '../components/ui/SiteFooter';
import ContactCard from '../components/contact/ContactCard';
import { TEAM_SECTIONS } from '../config/team';
import { BRAND, EVENT, BODY_BY_KEY } from '../config/experience';
import { DEPARTMENTS, DEPT_ORDER, EVENT_COUNT } from '../config/departments';
import { PHASES, useExperience } from '../store/useExperience';
import { interaction } from '../lib/interaction';
import { navigate } from '../lib/deptRoute';
import { useViewMore, ViewMoreButton } from '../components/ui/ViewMore';

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */


// Departments — one per world (the planets, the Moon and the space station), from config/departments.js.
const EVENTS = DEPT_ORDER.map((key) => ({
  key,
  name: DEPARTMENTS[key].name,
  world: key === 'moon' ? 'The Moon' : BODY_BY_KEY[key].name,
  copy: DEPARTMENTS[key].tagline,
  count: DEPARTMENTS[key].events.length,
}));

// Programme outline for the two days (detailed timings to be announced).
const STATS = [
  { value: '02', label: 'Days in orbit' },
  { value: String(DEPT_ORDER.length).padStart(2, '0'), label: 'Domains' },
  { value: String(EVENT_COUNT).padStart(2, '0'), label: 'Events' },
  { value: '₹10L', label: 'Prize pool', featured: true },
];

// Core Students: the contacts shown on the landing page (edit in config/team.js).
const STUDENT_CORE = TEAM_SECTIONS.find((s) => s.key === 'student-committee')?.people ?? [];

// The four forces of the fest (About section).
const PILLARS = [
  { name: 'Intellect', note: 'Quizzes, cases, code & debate', icon: 'M10 3a5 5 0 0 0-3 9v2h6v-2a5 5 0 0 0-3-9Z M8 17h4' },
  { name: 'Culturals', note: 'Music, dance, theatre & film', icon: 'M7 15V5l9-2v10 M7 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z M16 13a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z' },
  { name: 'Creativity', note: 'Pitches, memes, prompts & stories', icon: 'M10 2.5l1.8 4.6 4.7.4-3.6 3 1.1 4.7L10 12.6 6 15.2l1.1-4.7-3.6-3 4.7-.4Z' },
  { name: 'Competition', note: 'Esports, CTF & championships', icon: 'M6 4h8v3a4 4 0 0 1-8 0Z M6 5H3.5a2.5 2.5 0 0 0 2.6 3 M14 5h2.5a2.5 2.5 0 0 1-2.6 3 M10 11v3 M7 16h6' },
];

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                    */
/* -------------------------------------------------------------------------- */

function WatercolourFilters() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <filter id="watercolour-sm" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="grain" />
          <feColorMatrix in="grain" type="saturate" values="0" result="grainMono" />
          <feComponentTransfer in="grainMono" result="grainSoft">
            <feFuncR type="linear" slope="0.35" intercept="0.74" />
            <feFuncG type="linear" slope="0.35" intercept="0.74" />
            <feFuncB type="linear" slope="0.35" intercept="0.74" />
          </feComponentTransfer>
          <feComposite in="grainSoft" in2="displaced" operator="in" result="grainMasked" />
          <feBlend in="displaced" in2="grainMasked" mode="multiply" />
        </filter>
      </defs>
    </svg>
  );
}

function SectionHeading({ eyebrow, children }) {
  return (
    <div className="mb-14 flex flex-col items-center gap-4 text-center">
      <p className="inline-flex items-center gap-3 font-mono text-[0.65rem] tracking-[0.4em] text-gold-300/80 uppercase">
        <Star className="h-2 w-2 text-gold-400/70" />
        {eyebrow}
        <Star className="h-2 w-2 text-gold-400/70" />
      </p>
      <h2 className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-[0.05em] uppercase sm:text-5xl">{children}</h2>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Landing page. Transparent over the persistent WebGL canvas, so the live
 * solar system stays centred behind the hero and keeps revolving. Elements
 * marked [data-reveal] are revealed by the GSAP master timeline at hand-off.
 */
export default function LandingPage({ landingRef }) {
  const vmDomains = useViewMore(EVENTS.length, 4, 'lg');
  const vmCore = useViewMore(STUDENT_CORE.length, 3);
  const interactive = useExperience((s) => s.phase === PHASES.LANDING_IDLE);
  const quality = useExperience((s) => s.quality);
  const focused = useExperience((s) => s.focus !== null);
  const [active, setActive] = useState('home');
  const scrimRef = useRef(null);
  const setFocus = useExperience((s) => s.setFocus);
  // A department page covers the landing: hide it (keeps its scroll position).
  const covered = useExperience((s) => s.deptCovered);
  const inDept = useExperience((s) => s.dept !== null || s.galleryOpen || s.scheduleOpen || s.rulesOpen || s.eventsOpen || s.aboutOpen || s.contactOpen || s.sponsorsOpen || s.notFound);
  const cosmosRef = useRef(null);

  // Darken the live scene as the reader scrolls past the hero (one write per frame, max).
  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      const vh = window.innerHeight;
      const cosmos = cosmosRef.current?.getBoundingClientRect();
      const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
      // The explore section is several screens tall; while it scrolls past, the
      // system stays on screen (the canvas is fixed) and revolves with the scroll.
      const enter = cosmos ? clamp01(1 - cosmos.top / vh) : 0; // 0 in the hero → 1 once it reaches the top
      const exit = cosmos ? clamp01(cosmos.bottom / vh) : 0; // 1 → 0 as its end scrolls away
      const section = Math.min(enter, exit);
      interaction.section = section;
      interaction.orbitScroll = cosmos ? clamp01(-cosmos.top / Math.max(cosmos.height - vh, 1)) : 0;
      // Light scrim that only starts once the explore section scrolls away, so the
      // system is unobstructed through the hero and the explore section.
      const past = cosmos ? clamp01((vh * 0.8 - cosmos.bottom) / (vh * 0.6)) : 0;
      if (scrimRef.current) scrimRef.current.style.opacity = String(past * 0.5);
      // Beyond the explore section the planets fade away; only the stars remain.
      interaction.systemFade = 1 - past;
      // Planets are only clickable inside the explore section: leaving it (either
      // way) drops any focus so the camera returns to the overview.
      const { focus, setFocus } = useExperience.getState();
      if (focus !== null && (past > 0.5 || section < 0.4)) setFocus(null);
      // Scroll progress slowly turns the system (read by CameraRig).
      const max = document.documentElement.scrollHeight - window.innerHeight;
      interaction.scroll = max > 0 ? window.scrollY / max : 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Scroll-spy: highlight the nav link for the section in view.
  useEffect(() => {
    const sections = MENU_LINKS.map((l) => document.getElementById(l.id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={landingRef}
      inert={!interactive || inDept}
      className={`relative z-10 min-h-svh overflow-x-clip text-[#f4f1ea] ${interactive ? '' : 'invisible'}`}
      style={covered ? { visibility: 'hidden' } : undefined}
    >
      <WatercolourFilters />

      {/* Atmosphere over the shared WebGL scene */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div ref={scrimRef} className="absolute inset-0 bg-space-950 opacity-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-space-950/80 to-transparent" />
        <div className="grain absolute inset-0 opacity-[0.05] mix-blend-overlay" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Navigation                                                        */}
      {/* ------------------------------------------------------------------ */}
      <SiteNav active={active} reveal />

      <main className="relative">
        {/* ------------------------------------------------------------------ */}
        {/*  Hero                                                              */}
        {/* ------------------------------------------------------------------ */}
        <section
          id="home"
          className={`hero-orbit hero-compact relative mx-auto flex min-h-svh max-w-6xl flex-col items-center justify-center-safe px-5 pb-16 pt-28 text-center transition-opacity duration-700 sm:px-8 sm:pt-32 ${
            focused ? 'pointer-events-none opacity-0' : ''
          }`}
        >
          {/* Soft navy/violet pool behind the copy keeps it legible over the live system. */}
          <div className="hero-shade pointer-events-none absolute inset-x-[4%] inset-y-[18%] -z-10" aria-hidden="true" />

          <p data-reveal className="hero-affil font-mono text-[0.56rem] leading-relaxed tracking-[0.34em] uppercase sm:text-[0.7rem] sm:tracking-[0.42em]">
            <span className="hero-affil__sheen" aria-hidden="true" />
            <Star className="hero-affil__star hidden h-2 w-2 text-gold-400 sm:block" />
            <span className="block text-white/90 sm:inline">{BRAND.universityFull}</span>
            <span className="mx-3 hidden text-gold-400/80 sm:inline">·</span>
            <span className="block whitespace-nowrap text-gold-200 sm:inline">{BRAND.campusFull}</span>
            <Star className="hero-affil__star hidden h-2 w-2 text-gold-400 sm:block" />
          </p>

          <h1 data-reveal className="relative isolate mt-6 sm:mt-8">
            <span className="title-cosmic block font-display text-[clamp(4rem,20vw,6.25rem)] font-bold leading-[0.98] tracking-[0.1em] [margin-right:-0.1em] sm:text-[clamp(3.6rem,10.6vw,9rem)]">
              <span className="block sm:inline">{BRAND.heroTitle[0]}-</span>
              <span className="block sm:inline">{BRAND.heroTitle[1]}</span>
            </span>
          </h1>

          <p data-reveal className="mt-5 inline-flex items-center gap-2.5 font-display text-[0.6rem] font-medium whitespace-nowrap tracking-[0.2em] text-white/85 uppercase sm:mt-6 sm:gap-4 sm:text-sm sm:tracking-[0.38em]">
            <Star className="h-2 w-2 text-gold-400" />
            {BRAND.heroTag}
            <Star className="h-2 w-2 text-gold-400" />
          </p>

          {/* Date + live countdown */}
          <div data-reveal className="mt-9 flex flex-col items-center gap-6 sm:mt-11">
            <p className="date-chip inline-flex items-center gap-3 rounded-full px-5 py-2 font-mono text-[0.62rem] tracking-[0.34em] text-gold-200 uppercase sm:text-[0.7rem]">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                <circle cx="10" cy="10" r="3.2" fill="currentColor" />
                <ellipse cx="10" cy="10" rx="8.5" ry="3" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(-20 10 10)" />
              </svg>
              <time dateTime="2027-02-04">{EVENT.dateLabel}</time>
            </p>
            <EventCountdown />
          </div>

          <div data-reveal className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <SolarButton href="#contact" royal bare>Register Now</SolarButton>
            <SolarButton href="#cosmos" variant="ghost" royal>
              Explore
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </SolarButton>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/*  Explore the system — a transparent, full-screen window onto the   */}
        {/*  live solar system (it zooms in as this section scrolls into view). */}
        {/* ------------------------------------------------------------------ */}
        <section
          id="cosmos"
          ref={cosmosRef}
          data-orbit-touch
          aria-label="Explore the solar system: click a planet or the sun to learn about its domain"
          className="cosmos-section relative h-[300svh]"
        >
          <h2 className="sr-only">Explore the {BRAND.fest} solar system</h2>
          {/* Pinned for the whole section: the only UI here — it signals the system is interactive. */}
          <div className="pointer-events-none sticky top-0 h-svh">
            <div className="mx-auto flex h-full w-full max-w-7xl items-start justify-end px-4 pt-[5.25rem] sm:px-8 sm:pt-28 lg:items-center lg:pt-16">
              {/* Phones / tablets: compact glass pill */}
              <button type="button" onClick={() => setFocus(0)} className="explore-pill pointer-events-auto lg:hidden">
                <span className="explore-pill__beacon" aria-hidden="true" />
                <span className="flex flex-col items-start leading-tight">
                  <span className="font-display text-[0.66rem] font-bold tracking-[0.24em] uppercase">Explore Domains</span>
                  <span className="mt-1 text-[0.52rem] tracking-[0.26em] text-gold-200/80 uppercase">Tap any planet</span>
                </span>
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-gold-200" aria-hidden="true">
                  <path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Desktop: glass panel on the right */}
              <aside className="explore-panel pointer-events-auto hidden lg:flex" aria-label="Explore domains">
                <Frame size="sm" />
                <p className="flex items-center gap-3 text-[0.6rem] font-bold tracking-[0.34em] text-gold-200/90 uppercase">
                  <span className="explore-pill__beacon" aria-hidden="true" />
                  Interactive system
                </p>
                <h3 className="mt-4 font-display text-[1.45rem] leading-[1.05] font-bold tracking-[0.08em] text-[#f6f1e7] uppercase">
                  Explore
                  <br />
                  Domains
                </h3>
                <span className="explore-panel__rule" aria-hidden="true" />
                <p className="text-[0.86rem] leading-relaxed text-white/65">
                  Every planet is a domain. Choose a world to fly to it and discover its events.
                </p>
                <ul className="mt-5 space-y-2.5 text-[0.62rem] font-bold tracking-[0.22em] text-white/55 uppercase">
                  <li className="flex items-center gap-3">
                    <span className="explore-panel__icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
                        <path d="M3 10h14M6 7l-3 3 3 3M14 7l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    Drag to orbit
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="explore-panel__icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
                        <circle cx="10" cy="10" r="3.2" fill="currentColor" />
                        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
                      </svg>
                    </span>
                    Click a planet
                  </li>
                </ul>
                <button type="button" onClick={() => setFocus(0)} className="explore-panel__cta">
                  Start the tour
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </aside>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/*  FUTURE SECTIONS PLUG IN BELOW.                                    */}
        {/*  Keep the <section id="…"> anchors (events, about, gallery,        */}
        {/*  schedule, rules, contact) so the navbar and scroll-spy keep       */}
        {/*  working, and swap the placeholder content freely.                 */}
        {/* ================================================================== */}

        {/* Events */}
        <section id="events" className="relative mx-auto max-w-7xl scroll-mt-28 px-5 py-24 sm:px-8 sm:py-32">
          <SectionHeading eyebrow={`${DEPT_ORDER.length} Domains · ${EVENT_COUNT} Events`}>
            Where every dream finds <span className="text-gold-gradient">its orbit</span>
          </SectionHeading>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {EVENTS.map((e, i) => (
              <li key={e.key} className={vmDomains.cls(i)}>
                <a
                  href={`#/dept/${e.key}`}
                  onClick={(ev) => {
                    ev.preventDefault();
                    navigate({ dept: e.key, view: 'orbit' });
                  }}
                  className="orbit-card glass group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition duration-500 hover:-translate-y-1.5"
                >
                  <Frame size="sm" />
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[0.65rem] tracking-[0.3em] text-white/40">{String(i + 1).padStart(2, '0')}</span>
                    <BodyIcon
                      bodyKey={e.key}
                      className={`w-14 transition duration-700 group-hover:rotate-12 group-hover:scale-110 ${e.key === 'saturn' ? 'mr-3' : ''}`}
                    />
                  </div>
                  <h3 className="mt-6 font-display text-lg font-bold leading-snug tracking-[0.1em] uppercase">{e.name}</h3>
                  <p className="mt-1 font-mono text-[0.62rem] tracking-[0.3em] text-gold-300/90 uppercase">
                    {e.world} · {e.count} event{e.count === 1 ? '' : 's'}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-white/55">{e.copy}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[0.7rem] tracking-[0.2em] text-white/60 uppercase transition group-hover:text-gold-200">
                    Enter orbit <span className="transition group-hover:translate-x-1">→</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <ViewMoreButton {...vmDomains} label="All domains" />
        </section>

        {/* About */}
        <section id="about" className="relative mx-auto max-w-6xl scroll-mt-28 px-5 pb-24 sm:px-8 sm:pb-32">
          <SectionHeading eyebrow="About the fest">
            One fest, <span className="text-gold-gradient">one orbit</span>
          </SectionHeading>
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-5 text-center text-base leading-relaxed text-white/65 sm:text-lg lg:text-left">
              <p>
                {BRAND.fest} is the flagship annual fest of {BRAND.universityFull}, {BRAND.campus} — two days where
                code, culture, art and ambition share one sky.
              </p>
              <p>
                {DEPT_ORDER.length} domains, {EVENT_COUNT} events, one gravitational pull. Find your world, gather your crew and launch with us on{' '}
                {EVENT.dateLabel}.
              </p>
              <p>
                From esports arenas and capture-the-flag labs to bands, stages and boardroom pitches, every world hosts its own missions — with
                a <span className="text-gold-200">₹10 lakh prize pool</span> waiting for the crews who conquer them.
              </p>
              <ul className="about-pillars">
                {PILLARS.map((p) => (
                  <li key={p.name} className="about-pillar">
                    <span className="about-pillar__icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20">
                        <path d={p.icon} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <b>{p.name}</b>
                      <small>{p.note}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass relative grid grid-cols-2 gap-px overflow-hidden rounded-3xl">
              <Frame />
              {STATS.map((s) => (
                <div key={s.label} className={`flex flex-col items-center gap-1 bg-white/[0.01] px-4 py-8 text-center ${s.featured ? 'about-prize' : ''}`}>
                  <span className="text-gold-gradient font-display text-4xl font-semibold sm:text-5xl">{s.value}</span>
                  <span className="font-mono text-[0.6rem] tracking-[0.3em] text-white/50 uppercase">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-12 flex justify-center">
            <SolarButton href="#/about" royal>Discover the campus</SolarButton>
          </div>
        </section>

        {/* Gallery */}
        <Gallery quality={quality} />

        {/* Schedule */}
        <section id="schedule" className="relative mx-auto max-w-5xl scroll-mt-28 px-5 py-24 sm:px-8 sm:py-32">
          <SectionHeading eyebrow={`Flight plan · ${EVENT.dateLabel}`}>Two days in orbit</SectionHeading>
          <ScheduleTeaser />
        </section>

        {/* Rules & regulations */}
        <section id="rules" className="relative mx-auto max-w-5xl scroll-mt-28 px-5 pb-24 sm:px-8 sm:pb-32">
          <SectionHeading eyebrow="Mission protocol">Rules &amp; regulations</SectionHeading>
          <RulesTeaser />
        </section>

        {/* Contact / registration */}
        <section id="contact" className="relative scroll-mt-28 px-5 pb-16 sm:px-8">
          <div className="glass relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] px-6 py-20 text-center sm:px-12 sm:py-24">
            <Frame size="lg" />
            <div
              className="pointer-events-none absolute -top-1/2 left-1/2 h-[140%] w-[140%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,190,90,0.16),transparent_55%)]"
              aria-hidden="true"
            />
            <FestMark className="relative mx-auto h-14" />
            <h2 className="relative mx-auto mt-6 max-w-3xl font-display text-3xl font-bold leading-tight tracking-[0.05em] uppercase sm:text-5xl">
              See you <span className="text-gold-gradient">in orbit.</span>
            </h2>
            <p className="relative mx-auto mt-5 max-w-md text-white/60">
              Registrations for {BRAND.fest} open soon. {EVENT.dateLabel} · {BRAND.campus}.
            </p>
            <div className="relative mt-9 flex justify-center">
              <SolarButton href="#contact" royal bare>Register Now</SolarButton>
            </div>

            {/* Student core: who to reach */}
            <div className="relative mt-12 border-t border-white/[0.08] pt-10">
              <p className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/80 uppercase">
                <Star className="h-2 w-2 text-gold-400/70" />
                Reach the student core
                <Star className="h-2 w-2 text-gold-400/70" />
              </p>
              <ul className="ct-grid ct-grid--landing text-left">
                {STUDENT_CORE.map((p, i) => (
                  <ContactCard key={`${p.name}-${p.role}-${i}`} person={p} index={i} compact className={vmCore.cls(i)} />
                ))}
              </ul>
              <ViewMoreButton {...vmCore} />
              <a href="#/contact" className="mt-7 inline-block font-mono text-[0.6rem] tracking-[0.3em] text-gold-200/80 uppercase transition hover:text-white">
                All contacts &amp; campus map →
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
