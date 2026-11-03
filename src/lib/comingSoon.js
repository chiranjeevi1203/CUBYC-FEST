/**
 * "Coming soon" for features that aren't open yet (registration, login).
 * Any button calls showComingSoon(); the <ComingSoon/> notice (mounted once in
 * App) listens for the event and shows itself.
 */
export const COMING_SOON_EVENT = 'cubyc:coming-soon';

/** kind: 'register' | 'login' — only changes the wording. */
export function showComingSoon(kind = 'register') {
  window.dispatchEvent(new CustomEvent(COMING_SOON_EVENT, { detail: { kind } }));
}
