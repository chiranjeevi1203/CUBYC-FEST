import { useAuth } from '../store/useAuth';
import { REGISTRATION_OPEN } from '../config/features';
import { showComingSoon } from './comingSoon';

/*
 * Every "Register" button on the site goes through here. Signed in → the
 * dashboard's Events section, where every event can be registered. Not signed
 * in → the login page, which asks to log in first and then carries on to the
 * dashboard's Events.
 */

const KEY = 'cubyc-after-login';
export const REGISTER_HASH = '#/dashboard/events';
/** What a Register link points to (no dashboard address while registration is closed). */
export const REGISTER_HREF = REGISTRATION_OPEN ? REGISTER_HASH : '#contact';

export function goRegister() {
  // Registration not open yet: just say so.
  if (!REGISTRATION_OPEN) {
    showComingSoon('register');
    return;
  }
  if (useAuth.getState().user) {
    window.location.hash = REGISTER_HASH;
    return;
  }
  try {
    sessionStorage.setItem(KEY, REGISTER_HASH);
  } catch {
    /* storage blocked: login still goes to the dashboard */
  }
  window.location.hash = '#/login';
}

/** Where to go after signing in, if a Register button sent the visitor here (read once). */
export function takeAfterLogin() {
  try {
    const to = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return to;
  } catch {
    return null;
  }
}

/** True while a Register button's "log in first" is pending (without clearing it). */
export function loginForRegister() {
  try {
    return sessionStorage.getItem(KEY) === REGISTER_HASH;
  } catch {
    return false;
  }
}
