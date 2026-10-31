import { useRef } from 'react';
import campus from '../../assets/about/campus.jpg';
import SiteNav from '../ui/SiteNav';
import SiteFooter from '../ui/SiteFooter';
import Star from '../ui/Star';
import SolarButton from '../ui/SolarButton';
import SpaceBackdrop from './SpaceBackdrop';
import Dignitaries from './Dignitaries';
import { OrnateCorners, OrnateDivider } from './Ornaments';
import { useMountedWhile, usePageShell, useRiseIn } from './usePageShell';
import { BRAND } from '../../config/experience';
import { DEPT_ORDER, EVENT_COUNT } from '../../config/departments';
import { useExperience } from '../../store/useExperience';

const STATS = [
  { value: String(DEPT_ORDER.length).padStart(2, '0'), label: 'Domains' },
  { value: String(EVENT_COUNT).padStart(2, '0'), label: 'Events' },
  { value: '02', label: 'Days in orbit' },
  { value: '₹10L+', label: 'Prize pool' },
];

// The university's vision, mission and core values (as published by CHRIST).
const CARDS = [
  {
    // a target with an arrow
    icon: 'M10 4a6 6 0 1 0 6 6 M10 7a3 3 0 1 0 3 3 M10 10l6-6 M13.5 3.5 16 4l.5 2.5 M16 4l-2.2 2.2',
    title: 'Vision',
    text: 'Excellence and Service',
    lead: true,
  },
  {
    // an eye in a viewfinder
    icon: 'M2.5 6V3.5H5 M15 3.5h2.5V6 M17.5 14v2.5H15 M5 16.5H2.5V14 M4 10s2.4-4 6-4 6 4 6 4-2.4 4-6 4-6-4-6-4Z M10 11.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z',
    title: 'Mission',
    text: 'CHRIST (Deemed to be University) is a nurturing ground for an individual’s holistic development to make effective contribution to the society in a dynamic environment.',
  },
  {
    // a cut gem
    icon: 'M6 3.5h8l3 4-7 9-7-9Z M3 7.5h14 M8 3.5 7 7.5l3 9 3-9-1-4',
    title: 'Core values',
    list: ['Faith in God', 'Moral Uprightness', 'Love of Fellow Beings', 'Social Responsibility', 'Pursuit of Excellence'],
  },
];

/** The campus, floating in space: the photo at night inside orbit rings, gently bobbing. */
function FloatingCampus() {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--rx', `${(((e.clientY - r.top) / r.height - 0.5) * -6).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2)}deg`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };
  return (
    <figure ref={ref} className="fcampus" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="fcampus__float">
        <span className="fcampus__halo" aria-hidden="true" />
        {/* Orbit rings: back halves behind the campus, front halves in front */}
        <svg className="fcampus__orbits fcampus__orbits--back" viewBox="0 0 1000 600" aria-hidden="true">
          <ellipse cx="500" cy="330" rx="480" ry="120" />
          <ellipse cx="500" cy="330" rx="410" ry="96" className="is-dash" />
        </svg>
        <div className="fcampus__tilt">
          <div className="fcampus__photo">
            <img src={campus} alt={`${BRAND.universityFull}, ${BRAND.campus}`} decoding="async" />
            <span className="fcampus__night" aria-hidden="true" />
            <span className="fcampus__lights" aria-hidden="true" />
          </div>
        </div>
        <svg className="fcampus__orbits fcampus__orbits--front" viewBox="0 0 1000 600" aria-hidden="true">
          <path d="M20 330a480 120 0 0 0 960 0" />
          <path d="M90 330a410 96 0 0 0 820 0" className="is-dash" />
          <circle r="7" className="fcampus__sat">
            <animateMotion dur="14s" repeatCount="indefinite" path="M20 330a480 120 0 0 0 960 0a480 120 0 0 0 -960 0" />
          </circle>
        </svg>
        {/* Drifting motes of light */}
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="fcampus__mote" style={{ '--x': `${8 + ((i * 37) % 84)}%`, '--d': `${(i * 0.7) % 6}s`, '--s': `${2 + (i % 3)}px` }} aria-hidden="true" />
        ))}
      </div>
      <figcaption className="fcampus__plate">
        <Star className="h-2 w-2 text-gold-400" />
        {BRAND.universityFull} · {BRAND.campus}
        <Star className="h-2 w-2 text-gold-400" />
      </figcaption>
    </figure>
  );
}

function AboutView({ open, onGone }) {
  const rootRef = usePageShell({
    open,
    onGone,
    leaveHash: '#about',
    onEnter: (tl) => {
      const root = rootRef.current;
      // fromTo (not from): an interrupted .from would leave its targets hidden.
      tl.fromTo(
        root.querySelectorAll('[data-hero]'),
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, clearProps: 'transform' },
        0.25,
      ).fromTo(
        root.querySelector('.fcampus'),
        { autoAlpha: 0, y: 60, scale: 0.94 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform' },
        0.35,
      );
    },
  });
  useRiseIn(rootRef);

  return (
    <div ref={rootRef} className="space-page fixed inset-0 z-40 overflow-y-auto overflow-x-hidden overscroll-contain text-[#f4f1ea]" data-no-orbit>
      <SpaceBackdrop />
      <SiteNav active="about" />

      <main className="relative z-10">
        {/* ---------- Hero: the campus in space ---------- */}
        <section className="mx-auto flex max-w-7xl flex-col items-center px-5 pt-[calc(env(safe-area-inset-top)+6.5rem)] text-center sm:px-8 sm:pt-32">
          <p data-hero className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
            <Star className="h-2 w-2 text-gold-400/70" />
            About the campus
            <Star className="h-2 w-2 text-gold-400/70" />
          </p>
          {/* The university leads; the campus sits beneath it, smaller and in gold */}
          {/* One line from tablets up (sized to the screen); phones wrap after the comma */}
          <h1 data-hero className="title-cosmic mt-4 font-display text-[clamp(1.5rem,6.6vw,2.2rem)] font-bold leading-[1.1] tracking-[0.06em] uppercase sm:text-[clamp(1rem,3.8vw,3.4rem)] sm:whitespace-nowrap">
            {BRAND.university}, <span className="whitespace-nowrap">Bangalore</span>
          </h1>
          <p data-hero className="mt-4 inline-flex items-center gap-3 sm:mt-5 sm:gap-4">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold-300/70 sm:w-14" aria-hidden="true" />
            <span className="bg-[linear-gradient(100deg,#fff1d2,#f3d39a_35%,#e9c27a_60%,#fbe4b0)] bg-clip-text text-transparent font-display text-[clamp(0.95rem,2.6vw,1.6rem)] font-bold [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.85))] tracking-[0.3em] whitespace-nowrap uppercase [margin-right:-0.3em]">
              {BRAND.campus}
            </span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold-300/70 sm:w-14" aria-hidden="true" />
          </p>
          <FloatingCampus />
        </section>

        {/* ---------- About ---------- */}
        <section className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
          <div data-rise className="sp-panel mx-auto max-w-4xl text-center">
            <OrnateCorners />
            <OrnateDivider className="mx-auto mb-5 w-56 text-gold-300/70" />
            <h2 className="font-display text-2xl font-bold tracking-[0.08em] uppercase sm:text-3xl">
              A campus <span className="text-gold-gradient">in orbit</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[0.98rem] leading-relaxed text-white/70 sm:text-[1.05rem]">
              {BRAND.campus} of {BRAND.universityFull} is where {BRAND.fest} lifts off — a place of learning, culture and ambition that, for two days,
              becomes the centre of its own small universe. Every domain is a world, every event a mission, and the campus is the launch pad they all
              orbit.
            </p>
            <ul className="sp-stats mt-8">
              {STATS.map((s) => (
                <li key={s.label}>
                  <b className="text-gold-gradient">{s.value}</b>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div data-rise className="mt-14 text-center">
            <p className="font-mono text-[0.58rem] tracking-[0.36em] text-gold-300/70 uppercase">What guides us</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-[0.08em] uppercase sm:text-3xl">
              Vision <span className="text-gold-gradient">and Mission</span>
            </h2>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {CARDS.map((c, i) => (
              <article key={c.title} data-rise className="sp-card" style={{ '--i': i }}>
                <OrnateCorners />
                <span className="sp-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" className="h-5 w-5">
                    <path d={c.icon} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <h3 className="sp-card__title">{c.title}</h3>
                <OrnateDivider className="mx-auto my-3 w-32 text-gold-300/50" />
                {c.text && <p className={`sp-card__text ${c.lead ? 'sp-card__text--lead' : ''}`}>{c.text}</p>}
                {c.list && (
                  <ul className="sp-card__list">
                    {c.list.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          <div data-rise className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <SolarButton
              href="#dignitaries"
              onClick={(e) => {
                e.preventDefault();
                rootRef.current?.querySelector('[data-team]')?.closest('#dignitaries')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Meet the team
            </SolarButton>
            <SolarButton href="#/events" variant="ghost">
              Explore the events
            </SolarButton>
          </div>
        </section>

        <Dignitaries scrollerRef={rootRef} />
      </main>
      <SiteFooter />
    </div>
  );
}

/** The About page (#/about). */
export default function AboutPage() {
  const open = useExperience((s) => s.aboutOpen);
  const [mounted, onGone] = useMountedWhile(open);
  if (!mounted) return null;
  return <AboutView open={open} onGone={onGone} />;
}
