import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { DEPARTMENTS, DEPT_ORDER, EVENT_COUNT, ORDER, eventSlug } from '../../config/departments';
import { BODY_BY_KEY, focusIdOf, prefersReducedMotion } from '../../config/experience';
import { navigate } from '../../lib/deptRoute';
import { useExperience } from '../../store/useExperience';
import DeptScene, { CAMERA_FOV, CAMERA_Z, createDeptState } from './DeptScene';
import EventsPanel from './EventsPanel';
import HubPanel from './HubPanel';
import FestMark from '../ui/FestMark';
import Star from '../ui/Star';

const pad = (n) => String(n).padStart(2, '0');
const indexOf = (k) => ORDER.indexOf(k);
const neighbour = (k, d) => ORDER[(indexOf(k) + d + ORDER.length) % ORDER.length];
const placeOf = (k) => (k === 'sun' ? 'The Sun' : k === 'moon' ? 'The Moon' : k === 'station' ? 'The Space Station' : BODY_BY_KEY[k].name);
const kindOf = (k) => (k === 'sun' ? 'Host star' : k === 'moon' ? 'Moon of Earth' : k === 'station' ? 'Orbital stage' : 'Planet');

// The interior is soft haze: once settled inside, render it at reduced resolution.
const INSIDE_DPR = 0.75;

/**
 * Inside a world nothing on the canvas needs 60 fps: the interior drifts slowly
 * behind the event briefs. Drive it at ~30 fps (frameloop="demand") so the GPU
 * and the compositor get half the work while reading / scrolling.
 */
function Throttle({ fps = 30 }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [invalidate, fps]);
  return null;
}

function Arrow({ dir = 1, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path
        d={dir > 0 ? 'M4 10h11m-4-5 5 5-5 5' : 'M16 10H5m4-5-5 5 5 5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Department pages: one per world (the sun, the planets and the Moon).
 *
 *  Orbit view   the world rises from the bottom edge as a semicircle, its radiation
 *               swelling as you near it; department name and brief at the top.
 *               ← / → (or the buttons beside the world) turn the wheel to the next world.
 *  Events view  clicking the world dives into it: it fills the screen from below,
 *               the atmosphere streaks past and its environment becomes the backdrop
 *               for every event's brief.
 *
 * Follows the store (dept / deptView / deptEvent), which follows the URL hash —
 * buttons only ever call navigate(). Has its own WebGL canvas; the landing canvas
 * pauses while this page covers it.
 */
export default function DepartmentView() {
  const dept = useExperience((s) => s.dept);
  const view = useExperience((s) => s.deptView);
  const selected = useExperience((s) => s.deptEvent);
  const quality = useExperience((s) => s.quality);
  const setDeptCovered = useExperience((s) => s.setDeptCovered);

  const st = useMemo(createDeptState, []);
  const [mounted, setMounted] = useState(false); // canvas stays mounted after the first visit
  const [open, setOpen] = useState(false);
  const [enterId, setEnterId] = useState(0);
  const [worlds, setWorlds] = useState([]);
  const [infoKey, setInfoKey] = useState(null);
  const [layer, setLayer] = useState('orbit');
  // true once we're fully inside a world (not mid-transition): cheaper rendering.
  const [settled, setSettled] = useState(false);

  const rootRef = useRef(null);
  const infoRef = useRef(null);
  const orbitRef = useRef(null);
  const eventsRef = useRef(null);
  const tl = useRef(null);
  const presented = useRef({ key: null, view: 'orbit' });
  const pendingEnter = useRef(null);
  const swipe = useRef(null);

  const reduced = prefersReducedMotion();
  const T = useCallback((s) => (reduced ? Math.min(s, 0.25) : s), [reduced]);
  const busy = () => !!tl.current?.isActive();

  const rises = () => (orbitRef.current ? Array.from(orbitRef.current.querySelectorAll('[data-rise]')) : []);
  const finishCurrent = () => {
    if (tl.current) {
      tl.current.progress(1);
      tl.current.kill();
      tl.current = null;
    }
  };

  /* ---------------------------------------------------------------------- */
  /*  Transitions                                                            */
  /* ---------------------------------------------------------------------- */

  const enter = (key, v) => {
    finishCurrent();
    presented.current = { key, view: v };
    st.approach = 0;
    st.dive = v === 'events' ? 1 : 0;
    st.warp = 0;
    st.swap.t = 1;
    st.hover = 0;
    setWorlds([{ key, role: 'current' }]);
    setInfoKey(key);
    setLayer(v);
    setSettled(false);
    setMounted(true);
    setOpen(true);
    setEnterId((n) => n + 1);
    document.documentElement.classList.add('dept-open');
    pendingEnter.current = v;
  };

  // Runs once the page is in the DOM (refs exist), before paint.
  useLayoutEffect(() => {
    const v = pendingEnter.current;
    if (!open || !v) return;
    pendingEnter.current = null;
    const root = rootRef.current;
    const items = rises();
    gsap.set(root, { autoAlpha: 0 });
    gsap.set(items, { autoAlpha: 0, y: 34 });
    gsap.set(eventsRef.current, { autoAlpha: 0, y: 60 });
    if (eventsRef.current) eventsRef.current.scrollTop = 0;

    const t = gsap.timeline({ onComplete: () => v === 'events' && setSettled(true) });
    t.to(root, { autoAlpha: 1, duration: T(0.8), ease: 'power2.out', onComplete: () => setDeptCovered(true) }, 0).to(
      st,
      { approach: 1, duration: T(2.4), ease: 'expo.out' },
      0.1,
    );
    if (v === 'events') t.to(eventsRef.current, { autoAlpha: 1, y: 0, duration: T(1), ease: 'expo.out' }, 0.35);
    else t.to(items, { autoAlpha: 1, y: 0, duration: T(1.1), ease: 'expo.out', stagger: reduced ? 0 : 0.07 }, 0.45);
    tl.current = t;
  }, [open, enterId, st, T, reduced, setDeptCovered]);

  const exit = () => {
    finishCurrent();
    // Back on the landing, the camera (and focus card) settle on the world you were just on.
    const { focus, setFocus } = useExperience.getState();
    if (focus !== null && presented.current.key) setFocus(focusIdOf(presented.current.key));
    presented.current = { key: null, view: 'orbit' };
    setSettled(false);
    setDeptCovered(false);
    document.documentElement.classList.remove('dept-open');
    tl.current = gsap
      .timeline({
        onComplete: () => {
          setOpen(false);
          tl.current = null;
        },
      })
      .to(st, { approach: 0, duration: T(0.8), ease: 'power2.in' }, 0)
      .to(rootRef.current, { autoAlpha: 0, duration: T(0.7), ease: 'power2.inOut' }, 0.1);
  };

  const swap = (from, to) => {
    finishCurrent();
    presented.current.key = to;
    const fwd = (indexOf(to) - indexOf(from) + ORDER.length) % ORDER.length;
    const dir = fwd <= ORDER.length / 2 ? 1 : -1;
    st.swap.t = 0;
    st.swap.dir = dir;
    setWorlds([
      { key: from, role: 'from' },
      { key: to, role: 'to' },
    ]);
    const info = infoRef.current;
    tl.current = gsap
      .timeline()
      .to(st.swap, {
        t: 1,
        duration: T(1.6),
        ease: 'power3.inOut',
        onComplete: () => setWorlds([{ key: to, role: 'current' }]),
      }, 0)
      .to(info, { x: -70 * dir, autoAlpha: 0, duration: T(0.45), ease: 'power2.in', onComplete: () => setInfoKey(to) }, 0)
      .fromTo(info, { x: 70 * dir, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: T(1), ease: 'expo.out', immediateRender: false }, reduced ? 0.3 : 0.8);
  };

  // Instant switch (e.g. Back / Forward to another world while inside one).
  const replace = (key) => {
    finishCurrent();
    presented.current.key = key;
    st.swap.t = 1;
    st.approach = 1;
    setWorlds([{ key, role: 'current' }]);
    setInfoKey(key);
  };

  const dive = () => {
    finishCurrent();
    presented.current.view = 'events';
    setLayer('events');
    const events = eventsRef.current;
    if (events) events.scrollTop = 0;
    tl.current = gsap
      .timeline({ onComplete: () => setSettled(true) })
      .to(rises(), { y: -28, autoAlpha: 0, duration: T(0.5), ease: 'power2.in', stagger: reduced ? 0 : 0.035 }, 0)
      .to(st, { dive: 1, duration: T(2.1), ease: 'power3.inOut' }, 0.1)
      .to(st, { warp: reduced ? 0 : 1, duration: T(0.8), ease: 'power2.in' }, 0.6)
      .to(st, { warp: reduced ? 0 : 0.035, duration: T(1.8), ease: 'power2.out' }, 1.4)
      .fromTo(events, { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: T(1.1), ease: 'expo.out' }, reduced ? 0.2 : 1.6);
  };

  const surface = () => {
    finishCurrent();
    presented.current.view = 'orbit';
    setSettled(false);
    tl.current = gsap
      .timeline({ onComplete: () => setLayer('orbit') })
      .to(eventsRef.current, { autoAlpha: 0, y: 50, duration: T(0.5), ease: 'power2.in' }, 0)
      .to(st, { warp: reduced ? 0 : 0.7, duration: T(0.5), ease: 'power1.in' }, 0)
      .to(st, { warp: 0, duration: T(1), ease: 'power2.out' }, 0.6)
      .to(st, { dive: 0, duration: T(1.8), ease: 'power3.inOut' }, 0.2)
      .fromTo(rises(), { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: T(0.9), ease: 'expo.out', stagger: reduced ? 0 : 0.05 }, reduced ? 0.2 : 1.25);
  };

  // Store → screen.
  useEffect(() => {
    const cur = presented.current;
    if (dept && !cur.key) {
      enter(dept, view);
      return;
    }
    if (!dept) {
      if (cur.key) exit();
      return;
    }
    if (dept !== cur.key) {
      if (cur.view === 'orbit' && view === 'orbit') swap(cur.key, dept);
      else replace(dept);
    }
    if (view !== presented.current.view) {
      if (view === 'events') dive();
      else surface();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept, view]);

  useEffect(
    () => () => {
      tl.current?.kill();
      document.documentElement.classList.remove('dept-open');
    },
    [],
  );

  /* ---------------------------------------------------------------------- */
  /*  Input                                                                  */
  /* ---------------------------------------------------------------------- */

  const go = useCallback(
    (d) => {
      if (busy() || presented.current.view !== 'orbit' || !presented.current.key) return;
      navigate({ dept: neighbour(presented.current.key, d) });
    },
    [],
  );
  const goTo = (key) => {
    if (busy() || presented.current.view !== 'orbit' || key === presented.current.key) return;
    navigate({ dept: key });
  };
  const enterWorld = (eventSlug = null) => {
    if (busy() && presented.current.view !== 'orbit') return;
    navigate({ view: 'events', event: eventSlug });
  };
  const toOrbit = () => navigate({ view: 'orbit' });
  const close = () => navigate(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (!useExperience.getState().dept) return;
      const inEvents = presented.current.view === 'events';
      if (e.key === 'Escape') {
        e.preventDefault();
        if (inEvents) toOrbit();
        else close();
        return;
      }
      if (inEvents) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof Element && e.target.closest('a, button'))) {
        e.preventDefault();
        enterWorld();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, go]);

  const toNdc = (e) => {
    const r = rootRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
  };
  const hitWorld = (e) => {
    const L = st.layout;
    const p = toNdc(e);
    return Math.hypot(p.x * (L.W / 2), p.y * (L.H / 2) - L.cy) < L.R;
  };

  const onPointerMove = (e) => {
    if (e.pointerType === 'touch') return;
    const p = toNdc(e);
    st.pointer.x = p.x;
    st.pointer.y = p.y;
    st.pointer.active = true;
  };
  const onPointerLeave = () => {
    st.pointer.active = false;
  };
  const onPointerDown = (e) => {
    swipe.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, used: false };
  };
  const onPointerUp = (e) => {
    const s = swipe.current;
    if (!s || e.pointerType !== 'touch' || presented.current.view !== 'orbit') return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && e.timeStamp - s.t < 700) {
      s.used = true;
      go(dx < 0 ? 1 : -1);
    }
  };
  const onClick = (e) => {
    if (swipe.current?.used) return;
    if (presented.current.view !== 'orbit' || busy()) return;
    if (e.target instanceof Element && e.target.closest('a, button, [data-no-world]')) return;
    if (hitWorld(e)) enterWorld();
  };

  if (!mounted) return null;

  const key = infoKey ?? ORDER[0];
  const d = DEPARTMENTS[key];
  const body = BODY_BY_KEY[key];
  const place = placeOf(key);
  const prev = neighbour(key, -1);
  const next = neighbour(key, 1);
  const inEvents = layer === 'events';
  const envKey = worlds.length ? worlds[worlds.length - 1].key : key;

  return (
    <div
      ref={rootRef}
      className={`dept-view fixed inset-0 z-40 overflow-hidden text-[#f4f1ea] ${open ? '' : 'invisible'}`}
      style={{ '--dept-r': '30vw', '--dept-top': '55svh' }}
      role="dialog"
      aria-modal="true"
      aria-label={`${d.name} — ${place}`}
      inert={!open}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onClick={onClick}
    >
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        frameloop={!open ? 'never' : settled ? 'demand' : 'always'}
        dpr={settled ? INSIDE_DPR : [1, quality === 'low' ? 1.5 : 2]}
        camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV, near: 0.1, far: 200 }}
        gl={{ antialias: quality !== 'low', alpha: false, powerPreference: 'high-performance', stencil: false }}
        onCreated={({ gl }) => gl.setClearColor('#03040a', 1)}
      >
        {worlds.length > 0 && <DeptScene st={st} worlds={worlds} envKey={envKey} quality={quality} rootRef={rootRef} />}
        {settled && <Throttle fps={30} />}
      </Canvas>
      <div className="dept-vignette pointer-events-none absolute inset-0" aria-hidden="true" />
      {!inEvents && <div className="grain pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" aria-hidden="true" />}

      {/* ---------------------------------------------------------------- */}
      {/*  Orbit view                                                       */}
      {/* ---------------------------------------------------------------- */}
      <div ref={orbitRef} className="pointer-events-none absolute inset-0" inert={inEvents}>
        <div className="dept-orbit-copy mx-auto flex w-full max-w-6xl flex-col items-center px-5 text-center sm:px-8">
          <div ref={infoRef} className="flex w-full flex-col items-center">
            <p data-rise className="inline-flex items-center gap-3 font-mono text-[0.58rem] tracking-[0.38em] text-white/60 uppercase sm:text-[0.64rem]">
              <Star className="h-2 w-2 text-gold-400/80" />
              {kindOf(key)} · {place}
              <Star className="h-2 w-2 text-gold-400/80" />
            </p>
            <h1
              data-rise
              className="title-cosmic mt-4 max-w-[16ch] font-display text-[clamp(2rem,7.4vw,4.6rem)] font-bold leading-[1] tracking-[0.08em] text-balance [margin-right:-0.08em] uppercase sm:mt-5 lg:max-w-none"
            >
              {d.name}
            </h1>
            <p data-rise className="mt-4 font-display text-[0.72rem] font-medium tracking-[0.22em] text-gold-200/90 uppercase sm:text-[0.86rem] sm:tracking-[0.3em]">
              {d.tagline}
            </p>
            <p data-rise className="dept-intro mt-4 max-w-xl text-[0.9rem] leading-relaxed text-white/65 sm:text-[0.98rem]">
              {d.intro}
            </p>
            <div data-rise className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:mt-6">
              {d.faculty && (
                <span className="dept-chip">
                  <span className="text-white/45">{d.facultyLabel ?? 'Faculty in-charge'}</span>
                  {d.faculty}
                </span>
              )}
              <span className="dept-chip">
                <span className="dept-chip__dot" aria-hidden="true" />
                {d.hub
                  ? `${pad(DEPT_ORDER.length)} domains · ${pad(EVENT_COUNT)} events`
                  : `${pad(d.events.length)} event${d.events.length === 1 ? '' : 's'}`}
              </span>
            </div>
            <ul data-rise className="dept-event-chips mt-3 flex-wrap items-center justify-center gap-x-1 gap-y-1.5">
              {/* The hub lists its departments (each turns the wheel to that world); departments list their events. */}
              {(d.hub ? DEPT_ORDER.map((k) => ({ name: DEPARTMENTS[k].name, go: () => goTo(k) })) : d.events.map((e) => ({ name: e.name, go: () => enterWorld(eventSlug(e.name)) }))).map(
                (item, i) => (
                  <li key={item.name} className="flex items-center">
                    {i > 0 && <span className="is-round mx-2 h-1 w-1 rounded-full bg-gold-400/50" aria-hidden="true" />}
                    <button
                      type="button"
                      className="pointer-events-auto font-mono text-[0.6rem] tracking-[0.2em] text-white/55 uppercase transition hover:text-gold-200"
                      onClick={item.go}
                    >
                      {item.name}
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>

        {/* Enter: sits on the crest of the world */}
        <div data-rise className="dept-enter absolute inset-x-0 flex justify-center">
          <button type="button" onClick={() => enterWorld()} className="dept-enter__btn pointer-events-auto">
            <span className="explore-pill__beacon" aria-hidden="true" />
            <span>{d.hub ? 'Enter CUBYC' : `Enter ${place.replace(/^The /, '')}`}</span>
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Turn the wheel: beside the semicircle */}
        <button
          data-rise
          type="button"
          onClick={() => go(-1)}
          className="dept-wheel-btn dept-wheel-btn--prev pointer-events-auto"
          aria-label={`Previous world: ${DEPARTMENTS[prev].name}`}
        >
          <span className="dept-wheel-btn__icon">
            <Arrow dir={-1} />
          </span>
          <span className="dept-wheel-btn__label">
            <span className="font-mono text-[0.52rem] tracking-[0.3em] text-white/45 uppercase">Previous</span>
            <span className="font-display text-[0.7rem] font-bold tracking-[0.16em] uppercase">{DEPARTMENTS[prev].name}</span>
          </span>
        </button>
        <button
          data-rise
          type="button"
          onClick={() => go(1)}
          className="dept-wheel-btn dept-wheel-btn--next pointer-events-auto"
          aria-label={`Next world: ${DEPARTMENTS[next].name}`}
        >
          <span className="dept-wheel-btn__label items-end text-right">
            <span className="font-mono text-[0.52rem] tracking-[0.3em] text-white/45 uppercase">Next world</span>
            <span className="font-display text-[0.7rem] font-bold tracking-[0.16em] uppercase">{DEPARTMENTS[next].name}</span>
          </span>
          <span className="dept-wheel-btn__icon">
            <Arrow dir={1} />
          </span>
        </button>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/*  Events view (inside the world)                                   */}
      {/* ---------------------------------------------------------------- */}
      <div ref={eventsRef} className="dept-events absolute inset-0 overflow-y-auto overscroll-contain" inert={!inEvents} data-no-world>
        {d.hub ? (
          <HubPanel onOpen={(k) => navigate({ dept: k, view: 'orbit' })} />
        ) : (
          <EventsPanel key={key} deptKey={key} selected={selected} onSelect={(slug) => navigate({ event: slug })} />
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/*  Top bar                                                          */}
      {/* ---------------------------------------------------------------- */}
      <header className="dept-topbar absolute inset-x-0 top-0 z-10 pt-[env(safe-area-inset-top)]" data-no-world>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-8">
          <button type="button" onClick={inEvents ? toOrbit : close} className="dept-back">
            <Arrow dir={-1} className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{inEvents ? `Back to ${place.replace(/^The /, '')}` : 'Solar system'}</span>
            <span className="sm:hidden">{inEvents ? 'Back' : 'Orbit'}</span>
          </button>

          <nav aria-label="Domains" className={`dept-dots hidden items-center gap-2 md:flex ${inEvents ? 'is-muted' : ''}`}>
            {ORDER.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => goTo(k)}
                disabled={inEvents}
                aria-label={`${DEPARTMENTS[k].name} (${placeOf(k)})`}
                aria-current={k === key ? 'true' : undefined}
                title={DEPARTMENTS[k].name}
                className={`dept-dot ${k === key ? 'is-active' : ''}`}
              />
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[0.62rem] tracking-[0.3em] text-white/50">
              <span className="text-gold-200">{pad(indexOf(key) + 1)}</span> / {pad(ORDER.length)}
            </span>
            <span className="hidden h-8 w-px bg-white/10 sm:block" aria-hidden="true" />
            <button type="button" onClick={close} className="dept-close" aria-label="Close and return to the solar system">
              <FestMark className="h-8" title="CUBYC — back to the solar system" />
            </button>
          </div>
        </div>
      </header>
    </div>
  );
}
