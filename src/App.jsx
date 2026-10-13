import { useEffect, useRef } from 'react';
import Experience from './components/Experience';
import LoaderHUD from './components/hud/LoaderHUD';
import CometCursor from './components/CometCursor';
import LandingPage from './pages/LandingPage';
import SpaceOverlays from './components/ui/SpaceOverlays';
import DepartmentView from './components/dept/DepartmentView';
import GalleryPage from './components/gallery/GalleryPage';
import { PHASES, useExperience } from './store/useExperience';
import { parseHash, syncFromLocation } from './lib/deptRoute';

/**
 * Layer stack (bottom → top):
 *   <Experience/>   one persistent R3F canvas — galaxy, warp, solar system (never unmounted)
 *   <LandingPage/>  DOM, transparent over the canvas, revealed by the master timeline
 *   <SpaceOverlays/> planet tooltip, focus card, interaction hint (live landing only)
 *   <DepartmentView/> department pages (own canvas) — #/dept/<key>[/events[/<event>]]
 *   <GalleryPage/>  the campus gallery around a black hole — #/gallery
 *   <LoaderHUD/>    DOM overlay that owns the GSAP master timeline; removed at hand-off
 *   <CometCursor/>  pointer layer (fine pointers only)
 */
export default function App() {
  const landingRef = useRef(null);
  const hudMounted = useExperience((s) => s.hudMounted);
  const quality = useExperience((s) => s.quality);
  const live = useExperience((s) => s.phase === PHASES.LANDING_IDLE);

  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', hudMounted);
  }, [hudMounted]);

  useEffect(() => {
    document.documentElement.classList.toggle('low-gfx', quality === 'low');
  }, [quality]);

  // Department routes: Back / Forward and deep links (opened once the intro hands off).
  useEffect(() => {
    if (!live) return undefined;
    if (parseHash()) syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [live]);

  // Gallery page: open whenever the hash is #/gallery (navbar link, Back / Forward, deep link).
  useEffect(() => {
    if (!live) return undefined;
    const sync = () => useExperience.getState().setGalleryOpen(window.location.hash === '#/gallery');
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [live]);

  return (
    <>
      <Experience />
      <LandingPage landingRef={landingRef} />
      <SpaceOverlays />
      <DepartmentView />
      <GalleryPage />
      {hudMounted && <LoaderHUD landingRef={landingRef} />}
      <CometCursor />
    </>
  );
}
