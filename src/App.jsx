import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Experience from './components/Experience';
import LoaderHUD from './components/hud/LoaderHUD';
import CometCursor from './components/CometCursor';
import LandingPage from './pages/LandingPage';
import SpaceOverlays from './components/ui/SpaceOverlays';
import ChatBot from './components/chat/ChatBot';
import { PHASES, useExperience } from './store/useExperience';
import { parseHash, syncFromLocation } from './lib/deptRoute';

/*
 * The full-screen pages are split into their own chunks: each loads the first time it is
 * opened (or earlier, in the background — see the prefetch below), so the first visit only
 * downloads the intro and the landing page.
 */
const PAGES = {
  dept: () => import('./components/dept/DepartmentView'),
  gallery: () => import('./components/gallery/GalleryPage'),
  schedule: () => import('./components/schedule/SchedulePage'),
  rules: () => import('./components/rules/RulesPage'),
  events: () => import('./components/eventsPage/EventsPage'),
  about: () => import('./components/about/AboutPage'),
  contact: () => import('./components/contact/ContactPage'),
  sponsors: () => import('./components/sponsors/SponsorsPage'),
  notFound: () => import('./components/system/NotFoundPage'),
};
const DepartmentView = lazy(PAGES.dept);
const GalleryPage = lazy(PAGES.gallery);
const SchedulePage = lazy(PAGES.schedule);
const RulesPage = lazy(PAGES.rules);
const EventsPage = lazy(PAGES.events);
const AboutPage = lazy(PAGES.about);
const ContactPage = lazy(PAGES.contact);
const SponsorsPage = lazy(PAGES.sponsors);
const NotFoundPage = lazy(PAGES.notFound);

/** Mounts a code-split page once it is first needed, then keeps it (each page hides itself when closed). */
function OnDemand({ when, children }) {
  const needed = useExperience(when);
  const [ever, setEver] = useState(needed);
  useEffect(() => {
    if (needed) setEver(true);
  }, [needed]);
  return needed || ever ? <Suspense fallback={null}>{children}</Suspense> : null;
}

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

  // Once the landing page is live, fetch the other pages one at a time while the browser is
  // idle, so opening any of them is instant. Skipped when the visitor asked to save data.
  useEffect(() => {
    if (!live || navigator.connection?.saveData) return undefined;
    const idle = window.requestIdleCallback ?? ((fn) => window.setTimeout(fn, 300));
    const queue = Object.values(PAGES);
    let stopped = false;
    const next = () => {
      const load = queue.shift();
      if (stopped || !load) return;
      load()
        .catch(() => {})
        .finally(() => idle(next, { timeout: 4000 }));
    };
    const start = window.setTimeout(() => idle(next, { timeout: 4000 }), 2500);
    return () => {
      stopped = true;
      window.clearTimeout(start);
    };
  }, [live]);

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
      <OnDemand when={(s) => s.dept !== null}>
        <DepartmentView />
      </OnDemand>
      <OnDemand when={(s) => s.galleryOpen}>
        <GalleryPage />
      </OnDemand>
      <OnDemand when={(s) => s.scheduleOpen}>
        <SchedulePage />
      </OnDemand>
      <OnDemand when={(s) => s.rulesOpen}>
        <RulesPage />
      </OnDemand>
      <OnDemand when={(s) => s.eventsOpen}>
        <EventsPage />
      </OnDemand>
      <OnDemand when={(s) => s.aboutOpen}>
        <AboutPage />
      </OnDemand>
      <OnDemand when={(s) => s.contactOpen}>
        <ContactPage />
      </OnDemand>
      <OnDemand when={(s) => s.sponsorsOpen}>
        <SponsorsPage />
      </OnDemand>
      <OnDemand when={(s) => s.notFound}>
        <NotFoundPage />
      </OnDemand>
      <ChatBot />
      {hudMounted && <LoaderHUD landingRef={landingRef} />}
      <CometCursor />
    </>
  );
}
