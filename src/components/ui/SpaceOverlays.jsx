import { useEffect, useRef, useState } from 'react';
import { BODIES, BRAND, EVENT, TOUR } from '../../config/experience';
import { PLANET_ART } from '../../lib/planetArt';
import { interaction } from '../../lib/interaction';
import { PHASES, useExperience } from '../../store/useExperience';

/** Floating label that follows the hovered planet (positioned by PlanetInteraction each frame). */
function PlanetTooltip() {
  const ref = useRef(null);
  useEffect(() => {
    interaction.tooltipEl = ref.current;
    return () => {
      interaction.tooltipEl = null;
    };
  }, []);
  return (
    <div ref={ref} data-visible="false" className="planet-tooltip pointer-events-none fixed left-0 top-0 z-30" aria-hidden="true">
      <span className="planet-tooltip__dot" />
      <span data-name className="font-display text-[0.7rem] font-semibold tracking-[0.24em] uppercase" />
      <span className="h-3 w-px bg-white/20" />
      <span data-track className="font-mono text-[0.6rem] tracking-[0.24em] text-gold-200/90 uppercase" />
    </div>
  );
}

function CardButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-gold-400/60 hover:text-gold-200"
    >
      {children}
    </button>
  );
}

/** Info card for the focused planet / the sun (camera flies to it in CameraRig). */
function FocusCard() {
  const focus = useExperience((s) => s.focus);
  const setFocus = useExperience((s) => s.setFocus);
  const [shown, setShown] = useState(focus);

  // Keep the last content while the card animates out.
  useEffect(() => {
    if (focus !== null) setShown(focus);
  }, [focus]);

  const open = focus !== null;
  const isSun = shown === 'sun';
  const planet = typeof shown === 'number' ? BODIES[shown] : null;
  // Tour order keeps each moon right after its planet.
  const step = (dir) => {
    const at = typeof focus === 'number' ? TOUR.indexOf(focus) : -1;
    setFocus(TOUR[(at + dir + TOUR.length) % TOUR.length]);
  };

  return (
    <aside
      className={`focus-card fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-md sm:inset-x-auto sm:bottom-8 sm:left-8 sm:mx-0 sm:w-[24rem] ${
        open ? 'is-open' : ''
      }`}
      aria-hidden={!open}
      inert={!open}
      aria-live="polite"
    >
      <div className="glass relative overflow-hidden rounded-[1.75rem] p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(233,194,122,0.18),transparent_65%)]" />
        <div className="relative flex items-start gap-4">
          <span className="relative mt-1 block h-14 w-14 shrink-0">
            {isSun ? (
              <span className="block h-full w-full rounded-full bg-[radial-gradient(circle_at_40%_35%,#fffaf0,#ffc04a_45%,#e2581c)] shadow-[0_0_30px_rgba(255,180,80,0.6)]" />
            ) : planet ? (
              <span
                className="wc-sphere absolute inset-0 rounded-full"
                style={{ backgroundImage: PLANET_ART[planet.name.toLowerCase()], filter: 'url(#watercolour-sm)' }}
              />
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.58rem] tracking-[0.32em] text-white/50 uppercase">
              {isSun
                ? 'The Sun · Heart of the system'
                : planet?.kind === 'moon'
                  ? `Moon of ${planet.parent} · ${planet.name}`
                  : planet
                    ? `Planet ${String(shown + 1).padStart(2, '0')} · ${planet.name}`
                    : ''}
            </p>
            <h3 className="mt-1.5 font-display text-xl font-bold tracking-[0.1em] text-[#f6f1e7] uppercase">
              {isSun ? BRAND.heroTitle.join('-') : planet?.track}
            </h3>
          </div>
          <CardButton onClick={() => setFocus(null)} label="Close">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </CardButton>
        </div>

        <p className="relative mt-4 text-sm leading-relaxed text-white/65">
          {isSun ? `${BRAND.subline} — ${EVENT.dateLabel}, ${BRAND.campus}.` : planet?.blurb}
        </p>

        <div className="relative mt-5 flex items-center justify-between gap-3">
          <a
            href={isSun ? '#about' : '#events'}
            onClick={() => setFocus(null)}
            className="inline-flex items-center gap-2 font-display text-[0.66rem] font-medium tracking-[0.24em] text-gold-200 uppercase transition hover:text-white"
          >
            {isSun ? 'About the fest' : 'View event'} <span aria-hidden="true">→</span>
          </a>
          <div className="flex items-center gap-2">
            <CardButton onClick={() => step(-1)} label="Previous world">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="m12 5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </CardButton>
            <CardButton onClick={() => step(1)} label="Next world">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="m8 5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </CardButton>
          </div>
        </div>
        <p className="relative mt-4 hidden font-mono text-[0.52rem] tracking-[0.28em] text-white/35 uppercase sm:block">
          ← → to travel · Esc to return
        </p>
      </div>
    </aside>
  );
}

/** DOM layers for the interactive solar system (tooltip + focus card); live landing page only. */
export default function SpaceOverlays() {
  const live = useExperience((s) => s.phase === PHASES.LANDING_IDLE);
  if (!live) return null;
  return (
    <>
      <PlanetTooltip />
      <FocusCard />
    </>
  );
}
