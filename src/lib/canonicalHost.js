/**
 * The site's one address is https://cubycfest.christuniversity.in. Anyone who
 * opens Firebase's default addresses (cubyc-4372f.web.app / .firebaseapp.com) is
 * sent to the same page there. Imported first in main.jsx, so it runs before
 * anything else loads. Preview channels (…--name.web.app) and local development
 * are left alone, as are Firebase's own /__/ pages (sign-in).
 */
export const CANONICAL_ORIGIN = 'https://cubycfest.christuniversity.in';
const OLD_HOSTS = ['cubyc-4372f.web.app', 'cubyc-4372f.firebaseapp.com'];

export const leaving = OLD_HOSTS.includes(window.location.hostname) && !window.location.pathname.startsWith('/__/');
if (leaving) {
  const { pathname, search, hash } = window.location;
  window.location.replace(`${CANONICAL_ORIGIN}${pathname}${search}${hash}`);
}
