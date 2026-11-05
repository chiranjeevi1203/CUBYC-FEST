/**
 * Clean page addresses (no "#"): /about, /events, /dept/earth/events/air-crash,
 * /dashboard/my-team… The server sends index.html for every path
 * (firebase.json rewrites), and this module moves between pages without reloading.
 *
 *   currentPath()   '/about' (no trailing slash; '/' for home)
 *   go('/about')    open a page (adds a history entry)
 *   go('#cosmos')   back to the landing page and scroll to that section (URL stays '/')
 *   onRoute(fn)     run fn on every page change (links, go(), Back / Forward)
 *
 * Every same-site link (<a href="/about">, <a href="#cosmos">) is handled here, so
 * components keep using plain links. Old "#/about" links (shared invites,
 * bookmarks) are turned into "/about" on load.
 */

export const ROUTE_EVENT = 'cubyc:route';

export function currentPath() {
  const p = window.location.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return !p || p === '/index.html' ? '/' : p;
}

const fire = () => window.dispatchEvent(new Event(ROUTE_EVENT));

/** Scroll the landing page to a section (#home → the top). */
function scrollToSection(id) {
  const run = () => {
    if (id === 'home' || id === 'top') return window.scrollTo({ top: 0 });
    document.getElementById(id)?.scrollIntoView();
    return undefined;
  };
  // Let a closing page release the scroll lock first.
  requestAnimationFrame(() => requestAnimationFrame(run));
}

/** Go to a page ('/about') or a landing section ('#cosmos'). */
export function go(to, { replace = false } = {}) {
  if (!to) return;
  if (to.startsWith('#/')) to = to.slice(1); // an old-style address
  if (to.startsWith('#')) {
    if (currentPath() !== '/') {
      window.history.pushState(null, '', '/');
      fire();
    }
    scrollToSection(to.slice(1));
    return;
  }
  const url = new URL(to, window.location.origin);
  if (url.origin !== window.location.origin) {
    window.location.assign(to);
    return;
  }
  const next = `${url.pathname}${url.search}`;
  if (next === `${window.location.pathname}${window.location.search}`) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', next);
  fire();
}

/** Run fn on every page change. Returns the unsubscribe. */
export function onRoute(fn) {
  window.addEventListener(ROUTE_EVENT, fn);
  return () => window.removeEventListener(ROUTE_EVENT, fn);
}

/** Paths that aren't pages of this app (served files, the chatbot API). */
const FILE_LIKE = /^\/(api|assets|fonts)\/|\.[a-z0-9]{2,5}$/i;

let installed = false;
/** Once, at start-up: old "#/…" addresses → clean ones, link clicks and Back / Forward. */
export function installRouting() {
  if (installed) return;
  installed = true;
  const h = window.location.hash;
  if (h.startsWith('#/')) window.history.replaceState(null, '', h.slice(1));
  else if (h.length > 1 && currentPath() === '/') {
    window.history.replaceState(null, '', '/');
    scrollToSection(h.slice(1));
  }

  window.addEventListener('popstate', fire);
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (href.startsWith('#')) {
      if (href.length < 2) return;
      e.preventDefault();
      go(href);
      return;
    }
    if (!href.startsWith('/') || href.startsWith('//') || FILE_LIKE.test(href.split(/[?#]/)[0])) return;
    e.preventDefault();
    go(href);
  });
}

/** Page titles, for the browser tab and search results. */
const SITE = 'CUBYC-FEST 2027 · CHRIST (Deemed to be University) Bangalore Yeshwanthpur Campus';
const TITLES = {
  '/events': 'All Events',
  '/about': 'About',
  '/gallery': 'Gallery',
  '/schedule': 'Schedule',
  '/rules': 'Rules',
  '/sponsors': 'Sponsors',
  '/contact': 'Contact',
  '/login': 'Sign in',
  '/dashboard': 'Dashboard',
};
export function titleFor(path, deptName = null) {
  const key = Object.keys(TITLES).find((k) => path === k || path.startsWith(`${k}/`));
  const name = key ? TITLES[key] : deptName;
  return name ? `${name} · CUBYC-FEST 2027` : SITE;
}
