import { useAuth } from '../store/useAuth';

/*
 * Every "Register" button on the site goes through here. Signed in → the
 * dashboard's Events section, where every event can be registered. Not signed
 * in → the login page, which asks to log in first and then carries on to the
 * dashboard's Events.
 */

const KEY = 'cubyc-after-login';
export const REGISTER_HASH = '#/dashboard/events';

export function goRegister() {
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
