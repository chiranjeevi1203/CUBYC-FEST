import { Fragment, useEffect, useRef, useState } from 'react';
import Frame from '../ui/Frame';
import Star from '../ui/Star';
import ReactorIcon from './ReactorIcon';
import { RULE_COUNT, RULE_SECTIONS } from '../../config/rules';
import { prefersReducedMotion } from '../../config/experience';

const RULES_HREF = '#/rules';
const PER_MODULE = 2; // key rules previewed per section; the rest live on the rules page

// One line icon per section (20×20, stroked).
const ICONS = {
  entry: 'M4 5h12v10H4Z M7 9h3 M7 12h6 M13 8.5a1.2 1.2 0 1 0 0 .1',
  reporting: 'M10 3.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13Z M10 6.5V10l2.5 1.6',
  competition: 'M6 4h8v3a4 4 0 0 1-8 0Z M6 5H3.5a2.5 2.5 0 0 0 2.6 3 M14 5h2.5a2.5 2.5 0 0 1-2.6 3 M10 11v3 M7 16h6',
  conduct: 'M10 3 4.5 5v4.5c0 3.4 2.4 6 5.5 7 3.1-1 5.5-3.6 5.5-7V5Z M7.5 10l1.8 1.8L12.8 8',
  safety: 'M10 3.5 17 16H3Z M10 8v3.5 M10 13.6v.1',
};

/** "**bold**" → gold highlight, as on the rules hologram. */
function Highlight({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') ? (
      <b key={i} className="font-semibold text-gold-200">
        {part.slice(2, -2)}
      </b>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function Module({ section, index }) {
  const shown = section.rules.slice(0, PER_MODULE);
  const more = section.rules.length - shown.length;
  return (
    <li className={`rlt-mod ${index < 3 ? 'md:col-span-2' : 'md:col-span-3'}`}>
      <div className="glass group relative flex h-full flex-col rounded-3xl p-6 transition duration-500 hover:border-gold-400/30" data-cursor="hover">
        <Frame />
        <span className="rlt-mod__scan" aria-hidden="true" />
        <div className="mb-4 flex items-center gap-3">
          <span className="rlt-mod__icon grid h-10 w-10 flex-none place-items-center">
            <svg viewBox="0 0 20 20" className="h-[1.15rem] w-[1.15rem]" aria-hidden="true">
              <path d={ICONS[section.key] ?? ICONS.conduct} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-mono text-[0.55rem] tracking-[0.3em] text-gold-300/70 uppercase">P-{String(index + 1).padStart(2, '0')}</span>
            <h3 className="font-display text-sm font-bold tracking-[0.14em] text-white uppercase sm:text-[0.95rem]">{section.title}</h3>
          </span>
          <span className="ml-auto flex-none font-mono text-[0.55rem] tracking-[0.24em] text-white/40 uppercase">
            {String(section.rules.length).padStart(2, '0')} rules
          </span>
        </div>
        <ul className="flex-1 space-y-2.5">
          {shown.map((r) => (
            <li key={r} className="flex gap-3 text-sm leading-relaxed text-white/65">
              <Star className="mt-[0.45rem] h-2 w-2 flex-none text-gold-400/70" />
              <span>
                <Highlight text={r} />
              </span>
            </li>
          ))}
        </ul>
        {more > 0 && (
          <p className="mt-4 border-t border-white/[0.07] pt-3 font-mono text-[0.53rem] tracking-[0.26em] text-white/35 uppercase">
            + {more} more in the full protocol
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * The protocol reactor (ReactorIcon.jsx, flat SVG): its turbine turns and its
 * core pulses; hover spins it up, and a click surges it with a shockwave, then
 * opens the rules page.
 */
function OrbButton() {
  const [engaging, setEngaging] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const engage = (e) => {
    // Modified clicks (new tab etc.) behave like a normal link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (engaging) return;
    if (prefersReducedMotion()) {
      window.location.hash = RULES_HREF;
      return;
    }
    setEngaging(true);
    timer.current = window.setTimeout(() => {
      window.location.hash = RULES_HREF;
      // Ready again when the visitor comes back.
      timer.current = window.setTimeout(() => setEngaging(false), 500);
    }, 760);
  };

  return (
    <a
      href={RULES_HREF}
      onClick={engage}
      className={`orb ${engaging ? 'is-engaging' : ''}`}
      data-cursor="hover"
      aria-label="Open the full rules and regulations"
    >
      <span className="orb__stage" aria-hidden="true">
        <span className="orb__halo" />
        <span className="orb__shock" />
        <ReactorIcon className="orb__reactor" />
      </span>
      <span className="orb__label">
        <small>
          {RULE_COUNT} rules · {RULE_SECTIONS.length} protocols
        </small>
        <b>{engaging ? 'Powering up…' : 'Access full protocol'}</b>
      </span>
    </a>
  );
}

/** Landing-page rules section body (the heading stays in LandingPage). */
export default function RulesTeaser() {
  return (
    <>
      <ul className="mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[0.58rem] tracking-[0.3em] text-white/50 uppercase sm:mb-10">
        <li>
          <b className="text-gold-200">{RULE_COUNT}</b> rules
        </li>
        <li aria-hidden="true">
          <Star className="h-1.5 w-1.5 text-gold-400/60" />
        </li>
        <li>
          <b className="text-gold-200">{String(RULE_SECTIONS.length).padStart(2, '0')}</b> protocols
        </li>
        <li aria-hidden="true">
          <Star className="h-1.5 w-1.5 text-gold-400/60" />
        </li>
        <li>
          Event rules on <b className="text-gold-200">each event page</b>
        </li>
      </ul>

      <ol className="grid gap-4 md:grid-cols-6">
        {RULE_SECTIONS.map((s, i) => (
          <Module key={s.key} section={s} index={i} />
        ))}
      </ol>

      <div className="mt-10 flex justify-center sm:mt-12">
        <OrbButton />
      </div>
    </>
  );
}
