import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { DEPARTMENTS, eventSlug } from '../../config/departments';
import { BODY_BY_KEY, prefersReducedMotion } from '../../config/experience';
import Star from '../ui/Star';
import Frame from '../ui/Frame';

/** 'Label: body' → { label, lines, bullets }. Lines beginning with '- ' become bullets. */
function parseRule(text) {
  const m = text.match(/^([^:\n]{2,64}):\s+([\s\S]*)$/);
  const label = m ? m[1] : null;
  const body = m ? m[2] : text;
  const rows = body.split('\n').map((r) => r.trim()).filter(Boolean);
  return {
    label,
    lines: rows.filter((r) => !r.startsWith('- ')),
    bullets: rows.filter((r) => r.startsWith('- ')).map((r) => r.slice(2)),
  };
}

const formatPhone = (p) => (p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p);
const pad = (n) => String(n).padStart(2, '0');

function Person({ role, name, phone }) {
  return (
    <div className="holo-person" data-holo-line>
      <span className="font-mono text-[0.55rem] tracking-[0.3em] text-gold-200/60 uppercase">{role}</span>
      <span className="mt-1 block font-display text-[0.95rem] font-bold tracking-[0.04em] text-[#f6f1e7]">{name}</span>
      {phone && (
        <a href={`tel:+91${phone}`} className="mt-1 inline-flex items-center gap-2 font-mono text-[0.72rem] tracking-[0.14em] text-gold-200/90 transition hover:text-white">
          <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden="true">
            <path
              d="M6.6 3.5 8.3 7 6.8 8.4a9.6 9.6 0 0 0 4.8 4.8l1.4-1.5 3.5 1.7-.6 2.7c-.1.5-.6.9-1.1.9A13 13 0 0 1 2.9 4.1c0-.5.4-1 .9-1.1l2.8-.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          +91 {formatPhone(phone)}
        </a>
      )}
    </div>
  );
}

/** Slowly turning HUD reticle in the hologram's corner. */
function Reticle() {
  const ticks = Array.from({ length: 24 }, (_, i) => i);
  return (
    <svg viewBox="0 0 64 64" className="holo-reticle" aria-hidden="true">
      <g className="holo-reticle__spin">
        <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.6" />
        {ticks.map((i) => (
          <line key={i} x1="32" y1="3" x2="32" y2={i % 6 === 0 ? 8 : 5.5} stroke="currentColor" strokeWidth="0.8" transform={`rotate(${i * 15} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.8" />
      <path d="M32 13a19 19 0 0 1 19 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="32" r="9" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
      <circle cx="32" cy="32" r="2.4" fill="currentColor" />
    </svg>
  );
}

/** Etched gold circuit traces on the deck's face. */
function Circuits() {
  return (
    <svg className="holo-deck__circuits" viewBox="0 0 1000 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 96h120l22-22h96l14 14h84" />
        <path d="M0 108h180l18-18h60" />
        <path d="M40 120V86l16-16h70" />
        <path d="M1000 96H880l-22-22h-96l-14 14h-84" />
        <path d="M1000 108H820l-18-18h-60" />
        <path d="M960 120V86l-16-16H874" />
        <path d="M300 120v-14l14-14h60l10-10h232l10 10h60l14 14v14" />
        <path d="M420 120v-8h160v8" />
        <path d="M230 50h70l12 12h56" />
        <path d="M770 50h-70l-12 12h-56" />
      </g>
      <g fill="currentColor">
        {[
          [120, 96], [238, 74], [336, 88], [258, 90], [126, 70], [880, 96], [762, 74], [664, 88], [742, 90], [874, 70],
          [384, 82], [616, 82], [300, 50], [700, 50], [368, 62], [632, 62],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />
        ))}
      </g>
    </svg>
  );
}

/**
 * Inside a world: a holographic event deck.
 * The department's events are stacked as chamfered tabs on the left (a row on
 * phones); a light rail glides to the selected tab and a beam links it to the
 * glass hologram, which powers off and back on with each new brief. A slim
 * projector deck stays docked at the bottom of the screen.
 */
export default function EventsPanel({ deptKey, selected, onSelect }) {
  const dept = DEPARTMENTS[deptKey];
  const body = BODY_BY_KEY[deptKey];
  const events = useMemo(() => dept.events.map((e) => ({ ...e, slug: eventSlug(e.name) })), [dept]);
  const index = Math.max(0, events.findIndex((e) => e.slug === selected));
  // The brief on the hologram lags the selection by one power cycle.
  const [shown, setShown] = useState(index);
  const event = events[shown];
  const rules = useMemo(() => event.rules.map(parseRule), [event]);
  const screenRef = useRef(null);
  const beamRef = useRef(null);
  const power = useRef(null);
  const first = useRef(true);
  const tabsRef = useRef(null);
  const railRef = useRef(null);
  const linkRef = useRef(null);
  const place = deptKey === 'moon' ? 'the Moon' : deptKey === 'station' ? 'the Space Station' : body.name;

  // Collapse toward the middle of whatever part of the hologram is on screen.
  const originFor = (el) => {
    const rect = el.getBoundingClientRect();
    const oy = Math.min(Math.max(window.innerHeight * 0.42 - rect.top, 60), Math.max(rect.height - 60, 60));
    return `50% ${oy}px`;
  };

  // Selection changed → power the hologram off, then swap the brief.
  useEffect(() => {
    if (index === shown) return undefined;
    const el = screenRef.current;
    power.current?.kill();
    if (prefersReducedMotion() || !el) {
      setShown(index);
      return undefined;
    }
    gsap.set(el, { transformOrigin: originFor(el) });
    power.current = gsap
      .timeline({ onComplete: () => setShown(index) })
      .to(el, { filter: 'brightness(1.9)', duration: 0.07, ease: 'none' })
      .to(el, { scaleY: 0.008, duration: 0.2, ease: 'power3.in' })
      .to(el, { scaleX: 0, opacity: 0, duration: 0.14, ease: 'power2.in' })
      .to(beamRef.current, { opacity: 0.15, duration: 0.2 }, 0)
      .fromTo(linkRef.current, { opacity: 1, scaleX: 1 }, { opacity: 0.25, scaleX: 0.35, duration: 0.35, ease: 'power2.in' }, 0);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // New brief in place → bring the hologram to the top of it, then power on.
  useLayoutEffect(() => {
    const el = screenRef.current;
    if (first.current || !el) {
      first.current = false;
      return;
    }
    const scroller = el.closest('.dept-events');
    const top = el.getBoundingClientRect().top;
    if (scroller && (top < 0 || top > window.innerHeight * 0.5)) scroller.scrollTop += top - 96;
    if (prefersReducedMotion()) return;
    gsap.set(el, { transformOrigin: originFor(el) });
    const lines = Array.from(el.querySelectorAll('[data-holo-line]')).slice(0, 14);
    power.current = gsap
      .timeline()
      .fromTo(el, { scaleX: 0, scaleY: 0.008, opacity: 1, filter: 'brightness(2.2)' }, { scaleX: 1, duration: 0.2, ease: 'power2.out' })
      .to(el, { scaleY: 1, duration: 0.55, ease: 'expo.out' })
      .to(el, { keyframes: { opacity: [1, 0.55, 1, 0.8, 1] }, duration: 0.32, ease: 'none' }, '<')
      .to(el, { filter: 'brightness(1)', duration: 0.6, ease: 'power2.out' }, '<0.1')
      .fromTo(lines, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.035, ease: 'power2.out' }, '<0.05')
      .fromTo(beamRef.current, { opacity: 1 }, { opacity: 0.45, duration: 1.2, ease: 'power2.out' }, 0)
      .fromTo(linkRef.current, { opacity: 1, scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: 'power3.out' }, 0)
      .to(linkRef.current, { opacity: 0.7, duration: 0.8 }, 0.3)
      .set(el, { clearProps: 'filter,transform,opacity' })
      .set(lines, { clearProps: 'opacity,visibility,transform' });
  }, [shown]);

  useEffect(() => () => power.current?.kill(), []);

  // Light rail glides to the selected tab; the link beam meets the hologram at its height.
  const placeRail = (animate) => {
    const list = tabsRef.current;
    const tab = list?.querySelectorAll('.holo-tab')[index];
    if (!tab) return;
    const vertical = window.matchMedia('(min-width: 1024px)').matches;
    const d = animate && !prefersReducedMotion() ? 0.6 : 0;
    // Measured from layout boxes (offsetTop is unreliable: the active tab's glowing
    // wrapper becomes its offsetParent).
    const lr = list.getBoundingClientRect();
    const tr = tab.getBoundingClientRect();
    const top = tr.top - lr.top + list.scrollTop;
    const left = tr.left - lr.left + list.scrollLeft;
    const box = vertical
      ? { x: 0, y: top, width: 3, height: tr.height }
      : { x: left, y: list.offsetHeight - 3, width: tr.width, height: 3 };
    gsap.to(railRef.current, { ...box, duration: d, ease: 'expo.out', overwrite: true });
    if (vertical) gsap.to(linkRef.current, { y: top + tr.height / 2, duration: d, ease: 'expo.out', overwrite: true });
    else list.scrollTo({ left: left - list.clientWidth / 2 + tr.width / 2, behavior: d ? 'smooth' : 'auto' });
  };
  useLayoutEffect(() => {
    placeRail(!first.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);
  useEffect(() => {
    const onResize = () => placeRail(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Tabs slide in one after another when the deck first comes up.
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !tabsRef.current) return;
    gsap.fromTo(
      tabsRef.current.querySelectorAll('.holo-tab'),
      { autoAlpha: 0, x: -24 },
      { autoAlpha: 1, x: 0, duration: 0.7, ease: 'expo.out', stagger: 0.07, delay: 0.25, clearProps: 'opacity,visibility,transform' },
    );
  }, []);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pt-24 sm:px-8 sm:pt-28">
      <header className="flex flex-col items-center text-center">
        <p className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
          <Star className="h-2 w-2 text-gold-400/70" />
          Inside {place}
          <Star className="h-2 w-2 text-gold-400/70" />
        </p>
        <h2 className="title-cosmic mt-4 font-display text-[clamp(2rem,6.4vw,4rem)] font-bold leading-[1.02] tracking-[0.08em] uppercase">{dept.name}</h2>
        <p className="mt-3 font-mono text-[0.62rem] tracking-[0.3em] text-white/55 uppercase">
          {dept.org ?? 'Department'} · {pad(events.length)} event{events.length === 1 ? '' : 's'}
        </p>
      </header>

      {/* ------------------------------------------------------------ */}
      {/*  The hologram                                                  */}
      {/* ------------------------------------------------------------ */}
      <div className="holo-layout mt-10 sm:mt-12">
      {/* ------------------------------------------------------------ */}
      {/*  Event tabs (left; a scrolling row on phones)                 */}
      {/* ------------------------------------------------------------ */}
      <nav className="holo-tabs" aria-label={`${dept.name} events`}>
        <ul ref={tabsRef} className="holo-tabs__list">
          {events.map((e, i) => (
            <li key={e.slug} style={{ '--tone': events.length > 1 ? i / (events.length - 1) : 0 }}>
              <button
                type="button"
                onClick={() => onSelect(e.slug)}
                aria-current={i === index ? 'true' : undefined}
                className={`holo-tab ${i === index ? 'is-active' : ''}`}
              >
                <span className="holo-tab__num">{pad(i + 1)}</span>
                <span className="flex min-w-0 flex-col items-start text-left">
                  <span className="holo-tab__name">{e.name}</span>
                  <span className="holo-tab__meta">{e.format}</span>
                </span>
              </button>
            </li>
          ))}
          <li ref={railRef} className="holo-tabs__rail" aria-hidden="true" />
        </ul>
        <span ref={linkRef} className="holo-tabs__link" aria-hidden="true" />
      </nav>

      <article ref={screenRef} className="holo-screen" aria-live="polite">
        <Frame size="lg" className="holo-frame" />

        <div className="holo-screen__hud" data-holo-line>
          <span className="inline-flex items-center gap-2.5">
            <span className="holo-led" aria-hidden="true" />
            Event {pad(shown + 1)} / {pad(events.length)}
          </span>
          <span className="hidden sm:inline">{dept.short} · Holo-deck</span>
        </div>

        <div className="relative flex items-start justify-between gap-6">
          <div className="min-w-0">
            <span className="holo-chip" data-holo-line>
              <span className="holo-led" aria-hidden="true" />
              {event.format}
            </span>
            <h3 className="holo-title mt-5" data-holo-line>
              {event.name}
            </h3>
            <p className="mt-3 max-w-2xl text-[0.98rem] leading-relaxed text-gold-200/85" data-holo-line>
              {event.summary}
            </p>
          </div>
          <Reticle />
        </div>

        {(event.faculty || event.student) && (
          <div className="relative mt-7 grid gap-3 sm:grid-cols-2">
            {event.faculty && <Person role="Faculty in-charge" name={event.faculty} />}
            {event.student && <Person role="Student in-charge" name={event.student.name} phone={event.student.phone} />}
          </div>
        )}

        <div className="relative mt-9 flex items-center gap-4" data-holo-line>
          <h4 className="font-mono text-[0.62rem] tracking-[0.36em] text-gold-300/85 uppercase">Format &amp; rules</h4>
          <span className="h-px flex-1 bg-linear-to-r from-gold-400/45 to-transparent" aria-hidden="true" />
        </div>
        <ol className="relative mt-3">
          {rules.map((r, i) => (
            <li key={i} className="holo-rule" data-holo-line>
              <span className="holo-rule__num">{pad(i + 1)}</span>
              <div className="min-w-0 text-[0.92rem] leading-relaxed text-white/75">
                {r.label && <p className="mb-1 font-display text-[0.8rem] font-bold tracking-[0.12em] text-[#f6f1e7] uppercase">{r.label}</p>}
                {r.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                {r.bullets.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {r.bullets.map((b) => (
                      <li key={b} className="flex gap-3">
                        <Star className="mt-[0.45em] h-1.5 w-1.5 shrink-0 text-gold-400/70" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </article>

      </div>

      {/* ------------------------------------------------------------ */}
      {/*  The projector deck (docked to the bottom of the screen)      */}
      {/* ------------------------------------------------------------ */}
      <div className="holo-deck" aria-hidden="true">
        <span ref={beamRef} className="holo-deck__beam" />
        <div className="holo-deck__body">
          <Circuits />
          <span className="holo-deck__emitter" />
          <p className="holo-deck__status">
            <span className="holo-led" />
            Projecting <span className="text-[#f6f1e7]">{event.name}</span>
            <span className="hidden sm:inline">
              · {pad(shown + 1)} / {pad(events.length)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
