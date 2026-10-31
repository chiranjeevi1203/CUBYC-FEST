import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import BrandLogo from './BrandLogo';
import JourneyDash from './JourneyDash';
import { BRAND, TIMELINE, prefersReducedMotion } from '../../config/experience';
import { buildMasterTimeline } from '../../lib/timeline';
import { useExperience } from '../../store/useExperience';

/** Remembered once the journey has been seen, so later visits fly in quickly. */
const INTRO_SEEN_KEY = 'cubyc-intro-seen';

/**
 * DOM overlay for the FPV loader. It builds and owns the GSAP master timeline,
 * which outlives this component by a beat: after the hand-off the same timeline
 * finishes revealing the landing hero over the live canvas. The journey dash
 * (bottom-left) reads 0 → 100% as we travel from the galaxy to the Sun.
 */
export default function LoaderHUD({ landingRef }) {
  const canvasReady = useExperience((s) => s.canvasReady);
  const setPhase = useExperience((s) => s.setPhase);
  const finishLoader = useExperience((s) => s.finishLoader);

  const [copyIndex, setCopyIndex] = useState(0);
  const [skipping, setSkipping] = useState(false);

  const rootRef = useRef(null);
  const dashRef = useRef(null);
  const dashApi = useRef(null);
  const veilRef = useRef(null);
  const tlRef = useRef(null);
  const handedOffRef = useRef(false);

  // Hand-off: if a skip veil is up, fade it before removing the HUD.
  const handleHandoff = useCallback(() => {
    if (handedOffRef.current) return;
    handedOffRef.current = true;
    try {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      /* storage blocked: the next visit just plays the full journey */
    }
    const veil = veilRef.current;
    if (veil && Number(gsap.getProperty(veil, 'opacity')) > 0.01) {
      gsap.to(veil, { opacity: 0, duration: 0.45, ease: 'power1.out', onComplete: finishLoader });
    } else {
      finishLoader();
    }
  }, [finishLoader]);

  useLayoutEffect(() => {
    if (!canvasReady) return undefined;
    handedOffRef.current = false;

    const landing = landingRef?.current ?? null;
    const tl = buildMasterTimeline({
      scene: useExperience.getState().scene,
      hud: {
        chrome: Array.from(rootRef.current.querySelectorAll('[data-hud]')),
        dash: dashRef.current,
        update: (frame) => dashApi.current?.update(frame),
        veil: veilRef.current,
      },
      landing,
      reveals: landing ? Array.from(landing.querySelectorAll('[data-reveal]')) : [],
      onPhase: setPhase,
      onCopy: setCopyIndex,
      onHandoff: handleHandoff,
      reducedMotion: prefersReducedMotion(),
    });
    // First visit: the full journey (a touch brisk); returning visitors: a quick fly-in.
    let seen = false;
    try {
      seen = localStorage.getItem(INTRO_SEEN_KEY) === '1';
    } catch {
      /* storage blocked: treat as a first visit */
    }
    tl.timeScale(seen ? TIMELINE.returnTimeScale : TIMELINE.timeScale);
    tlRef.current = tl;

    // Art-direction helper: ?scrub=3.2 freezes at 3.2s; ?scrub=99 jumps to the landing page.
    const scrub = parseFloat(new URLSearchParams(window.location.search).get('scrub'));
    const scrubbing = Number.isFinite(scrub);

    // Pause with the tab so nobody returns to a sequence that played unseen.
    const onVisibility = () => {
      if (document.hidden) tl.pause();
      else if (!scrubbing && tl.progress() < 1) tl.resume();
    };
    document.addEventListener('visibilitychange', onVisibility);

    if (scrubbing) tl.progress(Math.min(scrub / tl.duration(), 1), false).pause();
    else if (!document.hidden) tl.play(0);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      // Interrupted (e.g. StrictMode remount): kill. After hand-off, let the hero reveal finish.
      if (!handedOffRef.current) tl.kill();
      tlRef.current = null;
    };
  }, [canvasReady, landingRef, setPhase, handleHandoff]);

  const handleSkip = () => {
    const tl = tlRef.current;
    if (!tl || skipping) return;
    setSkipping(true);
    // Veil the cut, jump the timeline to its end state (callbacks fire), then lift the veil.
    gsap.to(veilRef.current, {
      opacity: 1,
      duration: 0.3,
      ease: 'power1.in',
      onComplete: () => tl.progress(1, false),
    });
  };

  const copyLine = TIMELINE.copy[copyIndex][1];

  return (
    <div ref={rootRef} className="pointer-events-none fixed inset-0 z-50 text-white" aria-busy="true">
      {/* Before the canvas is ready, hold on pure black (no flash). */}
      <div className={`absolute inset-0 bg-black transition-opacity duration-500 ${canvasReady ? 'opacity-0' : 'opacity-100'}`} />
      <div className="loader-vignette absolute inset-0" aria-hidden="true" />

      {/* Top-left: university mark, small and refined */}
      <div
        data-hud
        className="absolute left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] flex items-center gap-3 opacity-0 sm:left-8 sm:top-7"
      >
        <BrandLogo className="h-9 sm:h-11" />
        <span className="hidden border-l border-white/15 pl-3 font-mono text-[0.55rem] leading-relaxed tracking-[0.32em] text-white/55 uppercase sm:block">
          {BRAND.university}
          <br />
          <span className="text-gold-300/85">{BRAND.title}</span>
        </span>
      </div>

      {/* Bottom-left: the journey dash (0 → 100% to the Sun) */}
      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] sm:right-auto sm:bottom-8 sm:left-8 sm:w-[min(34rem,calc(100vw-4rem))]">
        <JourneyDash ref={dashRef} apiRef={dashApi} copyIndex={copyIndex} />
      </div>

      {/* Bottom-right: skip */}
      <div
        data-hud
        className="absolute top-[max(1.4rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] opacity-0 sm:top-auto sm:bottom-8 sm:right-8"
      >
        <button
          type="button"
          onClick={handleSkip}
          disabled={!canvasReady || skipping}
          className="pointer-events-auto rounded-full border border-white/15 bg-black/25 px-4 py-2 font-mono text-[0.58rem] tracking-[0.32em] text-white/70 backdrop-blur-sm transition hover:border-gold-400/60 hover:text-gold-200 disabled:opacity-40"
        >
          {skipping ? 'ENGAGING…' : 'SKIP INTRO'}
        </button>
      </div>

      {/* Veil used for the skip cut and the reduced-motion crossfade */}
      <div ref={veilRef} className="pointer-events-none absolute inset-0 bg-[#05060d] opacity-0" aria-hidden="true" />

      {/* Screen-reader status */}
      <p className="sr-only" role="status" aria-live="polite" aria-label={copyLine}>
        {copyLine}.
      </p>
    </div>
  );
}
