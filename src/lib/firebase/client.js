/**
 * The Firebase web app — loaded only when registration is open (it is imported
 * dynamically by store/useAuth.js), so the public site never downloads it.
 *
 * Config comes from VITE_FIREBASE_* (public by design: Firebase web config is
 * not a secret — the security rules and App Check are what protect the data).
 *   VITE_USE_EMULATORS=true         talk to the local emulators (npm run emulators)
 *   VITE_RECAPTCHA_ENTERPRISE_KEY   App Check site key (live project)
 */
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { browserLocalPersistence, connectAuthEmulator, initializeAuth, browserPopupRedirectResolver } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';

const env = import.meta.env;
const useEmulators = env.VITE_USE_EMULATORS === 'true';

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

// App Check: only this website (not scripts or copies of it) may use the backend.
if (!useEmulators && env.VITE_RECAPTCHA_ENTERPRISE_KEY) {
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_ENTERPRISE_KEY), isTokenAutoRefreshEnabled: true });
}

export const auth = initializeAuth(app, { persistence: browserLocalPersistence, popupRedirectResolver: browserPopupRedirectResolver });
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
