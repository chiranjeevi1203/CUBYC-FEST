import { useEffect, useRef, useState } from 'react';
import Frame from '../ui/Frame';
import Star from '../ui/Star';
import Shuttle from './Shuttle';
import { SCHEDULE_DAYS, clock } from '../../config/schedule';
import { prefersReducedMotion } from '../../config/experience';

const SCHEDULE_HREF = '#/schedule';
// Routine slots (check-in, lunch) are left to the full page; the cards show the highlights.
const highlights = (day) => day.items.filter((it) => it.tag !== 'All');
const SLOT_COUNT = SCHEDULE_DAYS.reduce((n, d) => n + d.items.length, 0);
const FIRST = clock(SCHEDULE_DAYS[0].items[0].start);
const LAST = clock(SCHEDULE_DAYS.at(-1).items.reduce((m, it) => (it.end > m ? it.end : m), '00:00'));

/**
 * The rail fills as the page scrolls: a gold line grows down through the dots
 * (its head following the middle of the screen) and each dot lights as the
 * line reaches it. Scrolling back up empties it again.
 */
function useRailFill(listRef) {
  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const dots = [...list.querySelectorAll('.sct-line__dot')];
    const rail = list.querySelector('.sct-line__rail');
    if (prefersReducedMotion()) {
      list.style.setProperty('--fill', '1');
      dots.forEach((d) => d.classList.add('is-lit'));
      return undefined;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      // Measured on the rail itself, which runs from the first dot's centre to the last's.
      const r = rail.getBoundingClientRect();
      const reach = window.innerHeight * 0.62; // the fill's head follows the screen's lower middle
      const p = Math.min(Math.max((reach - r.top) / Math.max(r.height, 1), 0), 1);
      list.style.setProperty('--fill', p.toFixed(4));
      const headY = r.top + p * r.height;
      dots.forEach((d) => {
        const b = d.getBoundingClientRect();
        d.classList.toggle('is-lit', b.top + b.height / 2 <= headY + 1);
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [listRef]);
}

/** A day of the flight plan: header, then a mini timeline of its highlights. */
function DayCard({ day, index }) {
  const items = highlights(day);
  const listRef = useRef(null);
  useRailFill(listRef);
  return (
    <li className="sct-day" data-day={index}>
      <div className="glass group relative flex h-full flex-col rounded-3xl p-6 transition duration-500 hover:border-gold-400/30 sm:p-7" data-cursor="hover">
        <Frame />
        <div className="mb-5 flex items-center gap-4">
          <span className="sct-day__num grid h-12 w-12 place-items-center rounded-full font-display text-base">{String(index + 1).padStart(2, '0')}</span>
          <span className="flex min-w-0 flex-col">
            <span className="font-mono text-[0.62rem] tracking-[0.3em] text-white/45 uppercase">{day.label}</span>
            <span className="font-mono text-[0.68rem] tracking-[0.24em] text-gold-200/90 uppercase">{day.date}</span>
          </span>
          <span className="sct-day__window ml-auto hidden font-mono text-[0.55rem] tracking-[0.24em] uppercase sm:inline">
            {clock(day.items[0].start)} → {clock(day.items.reduce((m, it) => (it.end > m ? it.end : m), '00:00'))}
          </span>
        </div>
        <h3 className="sct-day__title font-display text-2xl font-bold tracking-[0.08em] uppercase">{day.title}</h3>

        <ol ref={listRef} className="sct-line mt-5 flex-1">
          <li className="sct-line__rail" aria-hidden="true">
            <span className="sct-line__fill" />
            <span className="sct-line__head" />
          </li>
          {items.map((it) => (
            <li key={`${it.time}-${it.title}`} className="sct-line__item">
              <time className="sct-line__time">{clock(it.start)}</time>
              <span className="sct-line__dot" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm leading-snug text-white/85">{it.title}</span>
                <span className="mt-0.5 block font-mono text-[0.55rem] tracking-[0.22em] text-white/40 uppercase">
                  {it.venue} · <span className="sct-line__tag">{it.tag}</span>
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 border-t border-white/[0.07] pt-4 font-mono text-[0.55rem] tracking-[0.26em] text-white/35 uppercase">
          + {day.items.length - items.length} more on the full flight plan
        </p>
      </div>
    </li>
  );
}

/**
 * The launch button is the shuttle itself — nothing else. It idles in a gentle
 * float and leans toward the pointer; hover spools its engines up and nudges it
 * forward; a click launches it off to the right, then opens the full schedule.
 */
function LaunchButton() {
  const [launching, setLaunching] = useState(false);
  const timer = useRef(0);
  const ref = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Lean toward the pointer (pitch with its height, a touch of yaw with its side).
  const onMove = (e) => {
    const el = ref.current;
    if (!el || launching) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--tilt', `${(y * 14).toFixed(2)}deg`);
    el.style.setProperty('--lean', `${(x * 10).toFixed(1)}px`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty('--tilt', '0deg');
    ref.current?.style.setProperty('--lean', '0px');
  };

  const launch = (e) => {
    // Let modified clicks (new tab etc.) behave like a normal link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (launching) return;
    if (prefersReducedMotion()) {
      window.location.hash = SCHEDULE_HREF;
      return;
    }
    setLaunching(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      window.location.hash = SCHEDULE_HREF;
      // Reset once we're away, so the shuttle is back when the visitor returns.
      timer.current = window.setTimeout(() => {
        setLaunching(false);
        onLeave();
      }, 500);
    }, 820);
  };

  return (
    <a
      ref={ref}
      href={SCHEDULE_HREF}
      onClick={launch}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`launch ${launching ? 'is-launching' : ''}`}
      data-cursor="hover"
      aria-label="Launch the shuttle: open the full schedule"
      title="Open the full schedule"
    >
      <span className="launch__ship">
        <Shuttle />
      </span>
    </a>
  );
}

/** Landing-page schedule section body (the heading stays in LandingPage). */
export default function ScheduleTeaser() {
  return (
    <>
      <ul className="sct-stats mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[0.58rem] tracking-[0.3em] text-white/50 uppercase sm:mb-10">
        <li>
          <b className="text-gold-200">{String(SCHEDULE_DAYS.length).padStart(2, '0')}</b> days
        </li>
        <li aria-hidden="true">
          <Star className="h-1.5 w-1.5 text-gold-400/60" />
        </li>
        <li>
          <b className="text-gold-200">{SLOT_COUNT}</b> slots
        </li>
        <li aria-hidden="true">
          <Star className="h-1.5 w-1.5 text-gold-400/60" />
        </li>
        <li>
          <b className="text-gold-200">
            {FIRST} – {LAST}
          </b>{' '}
          daily window
        </li>
      </ul>

      <ol className="grid gap-4 md:grid-cols-2">
        {SCHEDULE_DAYS.map((d, i) => (
          <DayCard key={d.key} day={d} index={i} />
        ))}
      </ol>

      <div className="mt-10 flex justify-center sm:mt-12">
        <LaunchButton />
      </div>
    </>
  );
}
