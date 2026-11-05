/* global __REGISTRATION_OPEN__ */
/**
 * Feature switches, fixed at BUILD time (see vite.config.js → `define`).
 *
 * REGISTRATION_OPEN — the login page, the participant dashboard and every
 * Register / Login button. While false (the default) none of that code is
 * even included in the published site: the buttons say "Coming soon",
 * and /login and /dashboard show the 404 page.
 *
 * To turn it on (once the backend is ready), build with
 *   VITE_REGISTRATION_OPEN=true
 * e.g. in a `.env.production.local` file (never committed) or the CI settings.
 */
export const REGISTRATION_OPEN = typeof __REGISTRATION_OPEN__ !== 'undefined' && __REGISTRATION_OPEN__ === true;
