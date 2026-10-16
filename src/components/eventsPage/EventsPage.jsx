import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import SiteNav from '../ui/SiteNav';
import Frame from '../ui/Frame';
import Star from '../ui/Star';
import BodyIcon from '../ui/BodyIcon';
import Constellation from '../ui/Constellation';
import SolarButton from '../ui/SolarButton';
import { ALL_EVENTS } from '../../config/allEvents';
import { DEPARTMENTS, DEPT_ORDER } from '../../config/departments';
import { prefersReducedMotion } from '../../config/experience';
import { createShaderLayer } from '../../lib/blackHole';
import { COMET_FRAG } from '../../lib/cometSky';
import { navigate } from '../../lib/deptRoute';
import { useExperience } from '../../store/useExperience';

/*
 * Every event as a glass card, fanned along an arc. Scrolling (wheel, drag,
 * swipe, arrow keys) slides the fan; it settles on the nearest card, whose world
 * (planet, Moon or space station) appears in the orb on the left. Clicking a
 * card opens its brief; Register goes to the event's full page in its department.
 */

const pad = (n) => String(n).padStart(2, '0');
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
const FORMATS = [
  { key: 'all', label: 'Any size' },
  { key: 'solo', label: 'Individual' },
  { key: 'team', label: 'Team' },
];

function layoutFor(w, h) {
  const portrait = w < h * 0.85;
  const short = !portrait && h < 560; // phones held sideways: the fan sits right of the heading
  const cardW = portrait ? clamp(w * 0.52, 168, 230) : short ? clamp(h * 0.4, 130, 190) : clamp(w * 0.15, 190, 250);
  return {
    w,
    h,
    portrait,
    cardW,
    cardH: cardW * 1.38,
    spacing: cardW * (portrait ? 0.9 : 1.04),
    cx: w * (portrait ? 0.5 : short ? 0.64 : 0.56),
    // Short screens: centred between the nav (~76px) and the control strip (~64px).
    cy: short ? (76 + h - 64) / 2 : h * (portrait ? 0.62 : 0.6),
    curve: portrait ? 12 : 16,
  };
}

/**
 * Place a card at offset d from the centre of the fan. Only ~2 cards each side
 * are fully shown; side cards tilt gently, shrink and dim so the centre card leads.
 */
function poseCard(el, d, L) {
  const ad = Math.abs(d);
  const x = d * L.spacing * (1 - Math.min(ad, 4) * 0.04);
  const y = Math.pow(Math.min(ad, 4), 1.5) * L.curve - (ad < 1 ? (1 - ad) * 22 : 0);
  const rot = d * 3.5;
  const ry = clamp(-d * 9, -28, 28);
  const s = 1.06 - Math.min(ad, 4) * 0.09;
  const o = ad > 2.6 ? Math.max(0, 1 - (ad - 2.6) / 0.9) : 1;
  el.style.setProperty('--dim', (Math.min(ad, 2.5) / 2.5 * 0.55).toFixed(3));
  el.style.transform = `translate3d(${(L.cx + x - L.cardW / 2).toFixed(1)}px, ${(L.cy + y - L.cardH / 2).toFixed(1)}px, 0) rotateY(${ry.toFixed(2)}deg) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(3)})`;
  el.style.opacity = o.toFixed(3);
  el.style.zIndex = String(100 - Math.round(ad * 10));
  el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
  el.classList.toggle('is-center', ad < 0.5);
}

function EventCard({ e, cardRef, onOpen }) {
  return (
    <button ref={cardRef} type="button" className="ev-card" onClick={() => onOpen(e)} aria-label={`${e.name} — ${e.deptName}`}>
      <span className="ev-card__glass">
        <Frame size="sm" star={false} />
        <span className="ev-card__shine" aria-hidden="true" />
        <span className="ev-card__top">
          <span>{pad(e.no)}</span>
          <span className="ev-card__fmt">{e.format}</span>
        </span>
        <span className="ev-card__emblem" aria-hidden="true">
          <span className="ev-card__ring" />
          <Constellation data={e.constellation} className="w-[78%]" />
        </span>
        <span className="ev-card__const">{e.constellation.name}</span>
        <span className="ev-card__name">{e.name}</span>
        <span className="ev-card__dept">{e.deptName}</span>
        <span className="ev-card__more">
          View brief <span aria-hidden="true">→</span>
        </span>
      </span>
    </button>
  );
}

/** The world orb: the centred event's planet / Moon / station in a gold orbit ring. */
function WorldOrb({ dept, label }) {
  const [layers, setLayers] = useState([{ dept, id: 0 }]);
  const idRef = useRef(0);
  useEffect(() => {
    setLayers((prev) => {
      if (prev[prev.length - 1].dept === dept) return prev;
      idRef.current += 1;
      return [{ ...prev[prev.length - 1], out: true }, { dept, id: idRef.current }];
    });
    const t = window.setTimeout(() => setLayers((prev) => prev.filter((l) => !l.out)), 700);
    return () => window.clearTimeout(t);
  }, [dept]);

  return (
    <div className="ev-orb" aria-live="polite">
      <svg className="ev-orb__rings" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="92" className="ev-orb__ring ev-orb__ring--spin" />
        <circle cx="100" cy="100" r="80" className="ev-orb__ring" />
        <ellipse cx="100" cy="100" rx="98" ry="30" className="ev-orb__ring ev-orb__ring--tilt" />
        <circle cx="192" cy="100" r="3" className="ev-orb__moon" />
      </svg>
      <div className="ev-orb__body">
        {layers.map((l) => (
          <span key={l.id} className={`ev-orb__layer ${l.out ? 'is-out' : 'is-in'}`}>
            <BodyIcon bodyKey={l.dept} className="w-full" />
          </span>
        ))}
      </div>
      <p className="ev-orb__label">{label}</p>
    </div>
  );
}

function Brief({ e, onClose }) {
  const panel = useRef(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const card = panel.current.querySelector('.ev-brief__card');
    const lines = panel.current.querySelectorAll('[data-line]');
    gsap
      .timeline()
      .fromTo(panel.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 })
      .fromTo(card, { scale: 0.7, rotate: -8, y: 40, filter: 'brightness(2)' }, { scale: 1, rotate: -4, y: 0, filter: 'brightness(1)', duration: 0.9, ease: 'expo.out', clearProps: 'filter' }, 0)
      .fromTo(lines, { autoAlpha: 0, x: 18 }, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05 }, 0.15);
  }, []);
  const close = () => {
    if (prefersReducedMotion()) return onClose();
    gsap.to(panel.current, { autoAlpha: 0, duration: 0.3, onComplete: onClose });
    return undefined;
  };
  useEffect(() => {
    const onKey = (k) => k.key === 'Escape' && (k.stopImmediatePropagation(), close());
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const register = () => {
    useExperience.getState().setEventsOpen(false);
    navigate({ dept: e.dept, view: 'events', event: e.slug });
  };

  return (
    <div ref={panel} className="ev-brief" role="dialog" aria-modal="true" aria-label={e.name} onClick={close}>
      <div className="ev-brief__inner" onClick={(k) => k.stopPropagation()}>
        <div className="ev-brief__stage">
          <svg className="ev-brief__orbit" viewBox="0 0 400 400" aria-hidden="true">
            <circle cx="200" cy="200" r="186" />
            <circle cx="200" cy="200" r="150" strokeDasharray="2 7" />
          </svg>
          <div className="ev-brief__card">
            <Frame size="md" />
            <span className="ev-card__shine" aria-hidden="true" />
            <span className="ev-card__top">
              <span>{pad(e.no)}</span>
              <span className="ev-card__fmt">{e.format}</span>
            </span>
            <span className="ev-card__emblem" aria-hidden="true">
              <span className="ev-card__ring" />
              <Constellation data={e.constellation} className="w-[78%]" />
            </span>
            <span className="ev-card__const">{e.constellation.name}</span>
            <span className="ev-card__name">{e.name}</span>
            <span className="ev-card__dept">{e.deptName}</span>
          </div>
        </div>
        <div className="ev-brief__info">
          <p className="ev-brief__eyebrow" data-line>
            <Star className="h-2 w-2 text-gold-400/80" /> Event {pad(e.no)} · {e.constellation.name} · {e.world}
          </p>
          <h2 className="ev-brief__title" data-line>
            {e.name}
          </h2>
          <p className="mt-1 font-mono text-[0.62rem] tracking-[0.3em] text-gold-300/85 uppercase" data-line>
            {e.deptName}
          </p>
          <p className="mt-5 text-[0.98rem] leading-relaxed text-white/75" data-line>
            {e.summary}
          </p>
          <div className="mt-6" data-line>
            <p className="ev-brief__label">At a glance</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <span className="ev-brief__stat">
                <span>Format</span>
                <b>{e.format}</b>
              </span>
              <span className="ev-brief__stat">
                <span>Protocol</span>
                <b>{e.rules.length} rules</b>
              </span>
              {e.faculty && (
                <span className="ev-brief__stat col-span-2">
                  <span>Faculty in-charge</span>
                  <b>{e.faculty}</b>
                </span>
              )}
              {e.student && (
                <span className="ev-brief__stat col-span-2">
                  <span>Student in-charge</span>
                  <b>{e.student.name}</b>
                </span>
              )}
            </div>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3" data-line>
            <SolarButton onClick={register} bare>Register</SolarButton>
            <button type="button" className="ev-ghost" onClick={close}>
              Back to events
            </button>
          </div>
        </div>
        <button type="button" className="ev-brief__close" onClick={close} aria-label="Close">
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function EventsView({ open, onGone }) {
  const quality = useExperience((s) => s.quality);
  const setCovered = useExperience((s) => s.setDeptCovered);
  const reduced = prefersReducedMotion();

  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('all');
  const [format, setFormat] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [brief, setBrief] = useState(null);
  const [, setVersion] = useState(0);

  // Each filter is a predicate, so counts can be shown "with the other filters applied".
  const q = query.trim().toLowerCase();
  const byQuery = (e) => !q || `${e.name} ${e.deptName} ${e.world} ${e.constellation.name} ${e.summary}`.toLowerCase().includes(q);
  const byDept = (k) => (e) => k === 'all' || e.dept === k;
  const byFormat = (f) => (e) => f === 'all' || (f === 'solo' ? e.solo : !e.solo);
  const list = useMemo(() => ALL_EVENTS.filter((e) => byQuery(e) && byDept(dept)(e) && byFormat(format)(e)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, dept, format]);
  const deptCount = (k) => ALL_EVENTS.filter((e) => byQuery(e) && byFormat(format)(e) && byDept(k)(e)).length;
  const formatCount = (f) => ALL_EVENTS.filter((e) => byQuery(e) && byDept(dept)(e) && byFormat(f)(e)).length;
  const resetAll = () => {
    setQuery('');
    setDept('all');
    setFormat('all');
  };

  const rootRef = useRef(null);
  const bgRef = useRef(null);
  const headRef = useRef(null);
  const cards = useRef([]);
  const closing = useRef(false);
  const layout = useRef(layoutFor(window.innerWidth, window.innerHeight));
  const flow = useRef({ pos: 0, target: 0, intro: 0, time: 0, idle: 0, look: { x: 0, y: 0 }, pointer: { x: 0, y: 0 }, count: list.length });
  flow.current.count = list.length;
  const activeRef = useRef(0);

  // A new filter result starts from the first card.
  useEffect(() => {
    const f = flow.current;
    f.target = 0;
    if (reduced) f.pos = 0;
  }, [list, reduced]);

  /* ---------- enter / exit ---------- */
  useLayoutEffect(() => {
    const root = rootRef.current;
    document.documentElement.classList.add('dept-open');
    const head = headRef.current ? Array.from(headRef.current.querySelectorAll('[data-rise]')) : [];
    gsap.set(root, { autoAlpha: 0 });
    gsap.set(head, { autoAlpha: 0, y: 20 });
    const f = flow.current;
    f.pos = reduced ? 0 : -7;
    const tl = gsap
      .timeline()
      .to(root, { autoAlpha: 1, duration: reduced ? 0.2 : 0.7, ease: 'power2.out', onComplete: () => setCovered(true) })
      .to(f, { intro: 1, duration: reduced ? 0.2 : 1.6, ease: 'power2.out' }, 0.1)
      .to(head, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 }, 0.3);
    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      if (!closing.current) return undefined;
      closing.current = false;
      document.documentElement.classList.add('dept-open');
      const tl = gsap.timeline().to(rootRef.current, { autoAlpha: 1, duration: 0.4, onComplete: () => setCovered(true) });
      return () => tl.kill();
    }
    closing.current = true;
    // Register hands over to a department page: keep the page locked for it.
    if (!useExperience.getState().dept) {
      setCovered(false);
      document.documentElement.classList.remove('dept-open');
    }
    const tl = gsap
      .timeline({ onComplete: onGone })
      .to(flow.current, { intro: 0, duration: 0.5, ease: 'power2.in' }, 0)
      .to(rootRef.current, { autoAlpha: 0, duration: 0.5, ease: 'power2.inOut' }, 0.05);
    return () => tl.kill();
  }, [open, onGone, setCovered]);

  useEffect(
    () => () => {
      if (!useExperience.getState().dept) document.documentElement.classList.remove('dept-open');
    },
    [],
  );

  /* ---------- render loop ---------- */
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 0.75 : 1);
    const bg = createShaderLayer(bgRef.current, COMET_FRAG);
    const resize = () => {
      layout.current = layoutFor(window.innerWidth, window.innerHeight);
      bg?.resize(window.innerWidth, window.innerHeight, dpr);
      setVersion((v) => v + 1);
    };
    resize();
    window.addEventListener('resize', resize);
    const onMove = (e) => {
      flow.current.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      flow.current.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = clamp((now - last) / 1000, 0, 0.1);
      last = now;
      const f = flow.current;
      const L = layout.current;
      const max = Math.max(f.count - 1, 0);
      f.time += dt;
      f.idle += dt;
      // Settle on the nearest card once input stops.
      if (f.idle > 0.16) f.target = Math.round(clamp(f.target, 0, max));
      f.target = clamp(f.target, -0.4, max + 0.4);
      f.pos += (f.target - f.pos) * (1 - Math.exp(-dt * (reduced ? 30 : 6.5)));
      if (Math.abs(f.target - f.pos) < 0.0005) f.pos = f.target;
      const k = 1 - Math.exp(-dt * 2.5);
      f.look.x += (f.pointer.x - f.look.x) * k;
      f.look.y += (f.pointer.y - f.look.y) * k;

      cards.current.forEach((el, i) => {
        if (el && i < f.count) poseCard(el, i - f.pos, L);
      });
      const a = clamp(Math.round(f.pos), 0, max);
      if (a !== activeRef.current) {
        activeRef.current = a;
        setActive(a);
      }
      bg?.draw({
        uRes: [window.innerWidth * dpr, window.innerHeight * dpr],
        uTime: f.time,
        uTravel: f.time * 1.2 + f.pos * 3,
        uLook: [f.look.x, f.look.y],
        uIntro: f.intro * 0.85,
        uShield: 0,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      bg?.destroy();
    };
  }, [quality, reduced]);

  // Close the filter menu on an outside click.
  useEffect(() => {
    if (!filterOpen) return undefined;
    const onDown = (e) => {
      if (!(e.target instanceof Element && e.target.closest('.ev-filter'))) setFilterOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [filterOpen]);

  /* ---------- input ---------- */
  const go = useCallback((n) => {
    const f = flow.current;
    f.target = clamp(n, 0, Math.max(f.count - 1, 0));
    f.idle = 1;
  }, []);
  const openCard = useCallback(
    (e) => {
      const i = list.indexOf(e);
      if (i !== activeRef.current) {
        go(i); // first click brings a side card to the centre
        return;
      }
      setBrief(e);
    },
    [list, go],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (brief) return;
      if (e.target instanceof HTMLInputElement) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (filterOpen) setFilterOpen(false);
        else window.location.hash = '#events';
      } else if (e.key === 'ArrowRight') go(activeRef.current + 1);
      else if (e.key === 'ArrowLeft') go(activeRef.current - 1);
      else if (e.key === 'Enter' && list[activeRef.current] && !(e.target instanceof Element && e.target.closest('button, a'))) setBrief(list[activeRef.current]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [brief, filterOpen, list, go]);

  const onWheel = (e) => {
    if (brief || (e.target instanceof Element && e.target.closest('.ev-filter__menu'))) return;
    const f = flow.current;
    f.target += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.0042;
    f.idle = 0;
  };
  const drag = useRef(null);
  const onPointerDown = (e) => {
    if (brief || (e.target instanceof Element && e.target.closest('input, .ev-filter, .ev-hud, a'))) return;
    drag.current = { x: e.clientX, moved: 0 };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    d.x = e.clientX;
    d.moved += Math.abs(dx);
    if (d.moved > 6) {
      flow.current.target -= dx / layout.current.spacing;
      flow.current.idle = 0;
    }
  };
  const endDrag = () => {
    if (drag.current?.moved > 6) {
      // Swallow the click that ends a drag.
      const stop = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener('click', stop, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 50);
    }
    drag.current = null;
  };

  const L = layout.current;
  const current = list[active];
  const deptLabel = dept === 'all' ? 'All domains' : DEPARTMENTS[dept].name;
  const filtered = dept !== 'all' || format !== 'all';

  return (
    <div
      ref={rootRef}
      className="ev-page fixed inset-0 z-40 overflow-hidden text-[#f4f1ea]"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <canvas ref={bgRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="ev-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Golden sweep behind the fan, like the reference's light ribbon */}
      <svg className="ev-sweep" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-50 760 C 300 470, 800 420, 1650 560" />
        <path d="M-50 800 C 400 540, 900 500, 1650 640" />
      </svg>

      {/* Cards */}
      <div className="ev-stage absolute inset-0" style={{ '--card-w': `${L.cardW}px`, '--card-h': `${L.cardH}px` }}>
        {list.map((e, i) => (
          <EventCard key={e.slug} e={e} cardRef={(el) => (cards.current[i] = el)} onOpen={openCard} />
        ))}
        {list.length === 0 && (
          <div className="ev-empty">
            <p className="font-display text-lg font-bold tracking-[0.14em] uppercase">No events found</p>
            <p className="mt-2 text-sm text-white/55">Try a different search or clear the filters.</p>
            <button
              type="button"
              className="ev-ghost mt-5"
              onClick={() => {
                setQuery('');
                setDept('all');
                setFormat('all');
              }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <SiteNav active="events" />

      {/* Header row: orb + title (left), search + filter (right) */}
      <div ref={headRef} className="ev-head">
        <div className="ev-head__left" data-rise>
          {current && <WorldOrb dept={current.dept} label={current.world} />}
          <div className="ev-head__title">
            <p className="inline-flex items-center gap-3 font-mono text-[0.58rem] tracking-[0.4em] text-gold-300/85 uppercase">
              <Star className="h-2 w-2 text-gold-400/70" />
              {pad(list.length)} of {pad(ALL_EVENTS.length)} events
            </p>
            <h1 className="title-cosmic mt-2 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-none tracking-[0.12em] uppercase">Events</h1>
            {current && (
              <p className="mt-2 font-mono text-[0.58rem] tracking-[0.3em] text-white/55 uppercase">
                {current.deptName} · {pad(active + 1)} / {pad(list.length)}
              </p>
            )}
          </div>
        </div>

        <div className="ev-tools" data-rise>
          <label className="ev-search">
            <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden="true">
              <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="m13.2 13.2 3.6 3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events" aria-label="Search events" />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-white/50 hover:text-gold-200">
                ×
              </button>
            )}
          </label>
          <div className="ev-filter">
            <button type="button" className={`ev-filter__btn ${filtered ? 'is-on' : ''}`} onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path d="M3 5h14M6 10h8M8.5 15h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">Filter</span>
              {filtered && <span className="ev-filter__dot" aria-hidden="true" />}
            </button>
            {filterOpen && (
              <div className="ev-filter__menu" role="dialog" aria-label="Filter events">
                <Frame size="sm" star={false} />
                <div className="flex items-center justify-between">
                  <p className="font-display text-[0.72rem] font-bold tracking-[0.22em] text-[#f6f1e7] uppercase">Filter events</p>
                  <button type="button" className="ev-filter__reset" onClick={resetAll} disabled={!filtered && !q}>
                    Reset
                  </button>
                </div>
                <p className="ev-brief__label mt-4">Team size</p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {FORMATS.map((f) => (
                    <button key={f.key} type="button" className={`ev-pill ${format === f.key ? 'is-on' : ''}`} onClick={() => setFormat(f.key)}>
                      {f.label}
                      <span className="ev-pill__count">{formatCount(f.key)}</span>
                    </button>
                  ))}
                </div>
                <p className="ev-brief__label mt-4">Domain</p>
                <ul className="ev-filter__list">
                  {['all', ...DEPT_ORDER].map((k) => {
                    const n = deptCount(k);
                    return (
                      <li key={k} className={k === 'all' ? 'col-span-2' : ''}>
                        <button type="button" className={`ev-filter__opt ${dept === k ? 'is-on' : ''}`} onClick={() => setDept(k)} disabled={n === 0 && dept !== k}>
                          {k === 'all' ? <Star className="h-2.5 w-2.5 shrink-0 text-gold-400/80" /> : <BodyIcon bodyKey={k} className="w-4 shrink-0" />}
                          <span className="min-w-0 flex-1 truncate text-left">{k === 'all' ? 'All domains' : DEPARTMENTS[k].name}</span>
                          <span className="ev-filter__n">{n}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" className="ev-filter__done" onClick={() => setFilterOpen(false)}>
                  Show {list.length} event{list.length === 1 ? '' : 's'}
                </button>
              </div>
            )}
          </div>
          {(filtered || q) && (
            <div className="ev-chips">
              {q && (
                <button type="button" className="ev-chip" onClick={() => setQuery('')}>
                  “{query.trim()}” <span aria-hidden="true">×</span>
                </button>
              )}
              {format !== 'all' && (
                <button type="button" className="ev-chip" onClick={() => setFormat('all')}>
                  {FORMATS.find((f) => f.key === format).label} <span aria-hidden="true">×</span>
                </button>
              )}
              {dept !== 'all' && (
                <button type="button" className="ev-chip" onClick={() => setDept('all')}>
                  {deptLabel} <span aria-hidden="true">×</span>
                </button>
              )}
              <button type="button" className="ev-chip ev-chip--reset" onClick={resetAll}>
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigator */}
      {list.length > 0 && (
        <div className="ev-hud">
          <button type="button" className="bh-btn" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous event">
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d="M16 10H5m4-5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="ev-hud__track" aria-hidden="true">
            <span className="ev-hud__fill" style={{ transform: `scaleX(${list.length > 1 ? active / (list.length - 1) : 1})` }} />
          </div>
          <button type="button" className="bh-btn" onClick={() => go(active + 1)} disabled={active >= list.length - 1} aria-label="Next event">
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="ev-hud__open" onClick={() => current && setBrief(current)}>
            Open brief
          </button>
        </div>
      )}

      {brief && <Brief e={brief} onClose={() => setBrief(null)} />}
    </div>
  );
}

/** The events page (#/events): mounted while open, plus its exit animation. */
export default function EventsPage() {
  const open = useExperience((s) => s.eventsOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  const onGone = useCallback(() => setMounted(false), []);
  if (!mounted) return null;
  return <EventsView open={open} onGone={onGone} />;
}
