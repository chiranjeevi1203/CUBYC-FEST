import { DEPARTMENTS } from '../config/departments';
import { focusIdOf } from '../config/experience';
import { useExperience } from '../store/useExperience';

/**
 * Hash routes for the department pages, so the browser Back button and deep
 * links work without a router:
 *
 *   #/dept/<key>                  the world rising as a semicircle (orbit view)
 *   #/dept/<key>/events           inside the world: every event
 *   #/dept/<key>/events/<slug>    …with one event selected
 *
 * Landing anchors (#events, #cosmos…) never start with "#/", so they are untouched.
 * Each history entry we push carries { cubyc: depth } (1 = orbit, 2 = events),
 * so closing from the UI steps back through history instead of stacking entries.
 */

const PREFIX = '#/dept/';

export function parseHash(hash = window.location.hash) {
  if (!hash.startsWith(PREFIX)) return null;
  const [key, view, event] = hash.slice(PREFIX.length).split('/');
  if (!DEPARTMENTS[key]) return null;
  return { dept: key, view: view === 'events' ? 'events' : 'orbit', event: view === 'events' ? event || null : null };
}

function hashOf(route) {
  if (!route?.dept) return '';
  let h = `${PREFIX}${route.dept}`;
  if (route.view === 'events') h += '/events' + (route.event ? `/${route.event}` : '');
  return h;
}

const depth = () => window.history.state?.cubyc ?? 0;
const urlWith = (hash) => `${window.location.pathname}${window.location.search}${hash}`;

/**
 * Go to a department route (or null to leave the department pages).
 * Partial routes merge with the current one: navigate({ event }) keeps dept + view.
 */
export function navigate(next) {
  const s = useExperience.getState();
  const cur = { dept: s.dept, view: s.deptView, event: s.deptEvent };

  // Leaving the department pages: unwind the entries we pushed.
  if (!next) {
    if (!cur.dept) return;
    const d = depth();
    if (d > 0) window.history.go(-d);
    else {
      s.setRoute({ dept: null });
      window.history.replaceState(null, '', urlWith(''));
    }
    return;
  }

  const route = { ...cur, ...next };
  if (next.dept && next.dept !== cur.dept && !('view' in next)) route.view = 'orbit';
  if (route.view !== 'events') route.event = null;

  // Events → orbit: step back if we pushed the events entry.
  if (cur.dept && cur.view === 'events' && route.view === 'orbit' && route.dept === cur.dept && depth() >= 2) {
    window.history.back();
    return;
  }

  s.setRoute(route);
  const url = urlWith(hashOf(route));
  if (!cur.dept) window.history.pushState({ cubyc: 1 }, '', url);
  else if (cur.view !== 'events' && route.view === 'events') window.history.pushState({ cubyc: depth() + 1 }, '', url);
  else window.history.replaceState(window.history.state, '', url);
}

/** Browser Back / Forward (or a hand-typed hash) → store. */
export function syncFromLocation() {
  const route = parseHash();
  useExperience.getState().setRoute(route ?? { dept: null });
}

let pending = 0;
/**
 * Open a department from the live solar system: the camera starts flying to the
 * body first, then the department page fades in over the flight.
 */
export function openFromScene(key) {
  const { setFocus } = useExperience.getState();
  if (pending) return;
  setFocus(focusIdOf(key));
  pending = window.setTimeout(() => {
    pending = 0;
    navigate({ dept: key, view: 'orbit' });
  }, 620);
}
