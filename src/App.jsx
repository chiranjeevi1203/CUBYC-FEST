import { useEffect, useRef } from 'react';
import Experience from './components/Experience';
import LoaderHUD from './components/hud/LoaderHUD';
import CometCursor from './components/CometCursor';
import LandingPage from './pages/LandingPage';
import SpaceOverlays from './components/ui/SpaceOverlays';
import { useExperience } from './store/useExperience';

/**
 * Layer stack (bottom → top):
 *   <Experience/>   one persistent R3F canvas — galaxy, warp, solar system (never unmounted)
 *   <LandingPage/>  DOM, transparent over the canvas, revealed by the master timeline
 *   <SpaceOverlays/> planet tooltip, focus card, interaction hint (live landing only)
 *   <LoaderHUD/>    DOM overlay that owns the GSAP master timeline; removed at hand-off
 *   <CometCursor/>  pointer layer (fine pointers only)
 */
export default function App() {
  const landingRef = useRef(null);
  const hudMounted = useExperience((s) => s.hudMounted);
  const quality = useExperience((s) => s.quality);

  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', hudMounted);
  }, [hudMounted]);

  useEffect(() => {
    document.documentElement.classList.toggle('low-gfx', quality === 'low');
  }, [quality]);

  return (
    <>
      <Experience />
      <LandingPage landingRef={landingRef} />
      <SpaceOverlays />
      {hudMounted && <LoaderHUD landingRef={landingRef} />}
      <CometCursor />
    </>
  );
}
