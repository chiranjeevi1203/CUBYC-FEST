/**
 * The Firebase web app — loaded only when registration is open (it is imported
 * dynamically by store/useAuth.js), so the public site never downloads it.
 *
 * Config comes from VITE_FIREBASE_* (public by design: Firebase web config is
 * not a secret — the security rules and App Check are what protect the data).
 *   VITE_USE_EMULATORS=true         talk to the local emulators (npm run emulators)
 *   VITE_RECAPTCHA_V3_KEY           App Check with reCAPTCHA v3 (free; works on the Spark plan)
 *   VITE_RECAPTCHA_ENTERPRISE_KEY   …or with reCAPTCHA Enterprise (needs the Enterprise API / billing)
 */
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check';
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
const appCheckProvider = env.VITE_RECAPTCHA_V3_KEY
  ? new ReCaptchaV3Provider(env.VITE_RECAPTCHA_V3_KEY)
  : env.VITE_RECAPTCHA_ENTERPRISE_KEY
    ? new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_ENTERPRISE_KEY)
    : null;
if (!useEmulators && appCheckProvider) initializeAppCheck(app, { provider: appCheckProvider, isTokenAutoRefreshEnabled: true });

export const auth = initializeAuth(app, { persistence: browserLocalPersistence, popupRedirectResolver: browserPopupRedirectResolver });
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
