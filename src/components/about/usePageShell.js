import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '../../config/experience';
import { useExperience } from '../../store/useExperience';

/**
 * Mount / unmount around a full-screen page's open flag, keeping it mounted for
 * the exit fade. Returns [mounted, onGone].
 */
export function useMountedWhile(open) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  const onGone = useCallback(() => setMounted(false), []);
  return [mounted, onGone];
}

/**
 * The shell shared by the About and Dignitaries pages: fades the page in (then
 * pauses the landing scene underneath), fades it out on close, locks the body
 * scroll while open, and sends Esc back to the landing page (`leaveHash`).
 * `onEnter(tl)` can add the page's own entrance tweens to the timeline.
 */
export function usePageShell({ open, onGone, leaveHash, onEnter }) {
  const rootRef = useRef(null);
  const setCovered = useExperience((s) => s.setDeptCovered);
  const closing = useRef(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const reduced = prefersReducedMotion();
    document.documentElement.classList.add('dept-open');
    gsap.set(root, { autoAlpha: 0 });
    const tl = gsap.timeline().to(root, { autoAlpha: 1, duration: reduced ? 0.2 : 0.7, ease: 'power2.out', onComplete: () => setCovered(true) });
    if (!reduced) onEnter?.(tl);
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
    setCovered(false);
    document.documentElement.classList.remove('dept-open');
    const tl = gsap.timeline({ onComplete: onGone }).to(rootRef.current, { autoAlpha: 0, duration: 0.55, ease: 'power2.inOut' });
    return () => tl.kill();
  }, [open, onGone, setCovered]);

  useEffect(() => () => document.documentElement.classList.remove('dept-open'), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || document.documentElement.classList.contains('chat-open')) return;
      window.location.hash = leaveHash;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, leaveHash]);

  return rootRef;
}

/** Adds .is-in to [data-rise] children of `root` as they scroll into view. */
export function useRiseIn(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const els = root.querySelectorAll('[data-rise]:not(.is-in)');
    if (prefersReducedMotion()) {
      els.forEach((el) => el.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }),
      { root, rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
