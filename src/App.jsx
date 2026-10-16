import { useEffect, useRef } from 'react';
import Experience from './components/Experience';
import LoaderHUD from './components/hud/LoaderHUD';
import CometCursor from './components/CometCursor';
import LandingPage from './pages/LandingPage';
import SpaceOverlays from './components/ui/SpaceOverlays';
import DepartmentView from './components/dept/DepartmentView';
import GalleryPage from './components/gallery/GalleryPage';
import SchedulePage from './components/schedule/SchedulePage';
import RulesPage from './components/rules/RulesPage';
import EventsPage from './components/eventsPage/EventsPage';
import AboutPage from './components/about/AboutPage';
import ContactPage from './components/contact/ContactPage';
import SponsorsPage from './components/sponsors/SponsorsPage';
import ChatBot from './components/chat/ChatBot';
import { PHASES, useExperience } from './store/useExperience';
import { parseHash, syncFromLocation } from './lib/deptRoute';
import NotFoundPage from './components/system/NotFoundPage';

/** Hash routes that open a page (department routes are checked by parseHash). */
const PAGE_HASHES = ['#/events', '#/gallery', '#/schedule', '#/rules', '#/about', '#/contact', '#/sponsors'];

/**
 * Layer stack (bottom → top):
 *   <Experience/>   one persistent R3F canvas — galaxy, warp, solar system (never unmounted)
 *   <LandingPage/>  DOM, transparent over the canvas, revealed by the master timeline
 *   <SpaceOverlays/> planet tooltip, focus card, interaction hint (live landing only)
 *   <DepartmentView/> department pages (own canvas) — #/dept/<key>[/events[/<event>]]
 *   <GalleryPage/>  the campus gallery around a black hole — #/gallery
 *   <SchedulePage/> the two-day flight plan along the Milky Way — #/schedule
 *   <RulesPage/>    the spacecraft bridge; rules on a hologram — #/rules
 *   <EventsPage/>   all 27 events as a fan of glass cards — #/events
 *   <AboutPage/>    the campus floating in space + the dignitaries — #/about
 *   <ContactPage/>  coordinators, student core heads and the campus map — #/contact
 *   <SponsorsPage/> the sponsor tiers, revealed on scroll — #/sponsors
 *   <NotFoundPage/> lost in space: any unknown #/… address or path
 *   <ChatBot/>      CUBYC Comms: floating freighter (every page) → chat overlay
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

  // Gallery / schedule pages: open whenever the hash says so (navbar link, Back / Forward, deep link).
  useEffect(() => {
    if (!live) return undefined;
    const sync = () => {
      const { setGalleryOpen, setScheduleOpen, setRulesOpen, setEventsOpen, setAboutOpen, setContactOpen, setSponsorsOpen, setNotFound } = useExperience.getState();
      setEventsOpen(window.location.hash === '#/events');
      setGalleryOpen(window.location.hash === '#/gallery');
      setScheduleOpen(window.location.hash === '#/schedule');
      setRulesOpen(window.location.hash === '#/rules');
      setAboutOpen(window.location.hash === '#/about');
      setContactOpen(window.location.hash === '#/contact');
      setSponsorsOpen(window.location.hash === '#/sponsors');
      // Anything else that looks like a page address (or a path other than /) is lost in space.
      const hash = window.location.hash;
      const badPath = !['/', '/index.html'].includes(window.location.pathname);
      const badHash = hash.startsWith('#/') && !PAGE_HASHES.includes(hash) && !parseHash(hash);
      setNotFound(badPath || badHash);
    };
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
      <SchedulePage />
      <RulesPage />
      <EventsPage />
      <AboutPage />
      <ContactPage />
      <SponsorsPage />
      <NotFoundPage />
      <ChatBot />
      {hudMounted && <LoaderHUD landingRef={landingRef} />}
      <CometCursor />
    </>
  );
}
