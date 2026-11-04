# CUBYC Fest 2027 — backend

Firebase project `cubyc-4372f`, region **asia-south1 (Mumbai)**.

| Piece | Where |
|---|---|
| Google sign-in | Firebase Authentication (Google provider only) |
| Database | Cloud Firestore — rules in [`firestore.rules`](firestore.rules) |
| Server code | Cloud Functions — [`functions/`](functions) |
| Website ↔ Firebase | [`src/lib/firebase/`](src/lib/firebase), [`src/store/useAuth.js`](src/store/useAuth.js) |

The browser is never trusted: accounts, CUBYC IDs, roles and admin actions are
done by Cloud Functions; the security rules let a participant change only their
own `profile`, field by field.

## Data

- `users/{uid}` — `email` (from Google, permanent), `cubycId` (permanent), `profile {…}`,
  `profileComplete` (set by the server), `status`, `pass`, `createdAt`, `updatedAt`
- `cubycIds/{CB27-XXXXXX}` — guarantees each ID is unique
- `admins/{uid}`, `adminInvites/{email}` — who has admin access
- `auditLogs/{id}` — every account creation and role change
- `stats/{doc}` — dashboard numbers (written by the server)

## Roles

Roles are custom claims on the sign-in token, set only by the server:

- **superadmin** — everything. Root super admins are listed in
  `functions/.env.cubyc-4372f` (`SUPERADMIN_EMAILS`) and become super admins on
  their first sign-in. Other super admins are granted from the admin portal.
- **admin** — read-only access to all participants and statistics; `depts` lists
  the departments whose event analytics they look after.

Grant / change / remove: the `setAdminRole` function (super admins only). Someone
who hasn't signed up yet gets the role on their first Google sign-in.

## Working locally (no real data, no cost)

Needs Java 11+ and the Firebase CLI (`npm i -g firebase-tools`).

```bash
npm run emulators        # Auth + Firestore + Functions on your computer (UI: http://127.0.0.1:4000)
npm run dev:emulator     # the website, registration switched on, using the emulators
npm run test:backend     # security-rule and account tests (47) against the emulators
```

## Going live (in order)

1. Firebase console → upgrade to **Blaze**; add a **budget alert**.
2. Authentication → Sign-in method → enable **Google** only. Settings → Authorized
   domains: only the site's domains. Turn on **email enumeration protection**.
3. Firestore → create the database in **asia-south1**, production mode.
4. App Check → register the web app with **reCAPTCHA Enterprise**; enforce for
   Firestore and Cloud Functions once the site sends tokens.
5. Project settings → your web app's config → put it in `.env.production.local`
   (never committed):
   ```
   VITE_FIREBASE_API_KEY=…
   VITE_FIREBASE_AUTH_DOMAIN=…
   VITE_FIREBASE_PROJECT_ID=cubyc-4372f
   VITE_FIREBASE_APP_ID=…
   VITE_RECAPTCHA_ENTERPRISE_KEY=…
   ```
6. Google Cloud console → Credentials → restrict the browser API key to the site's
   domains and the Firebase APIs it uses.
7. `firebase deploy --only firestore,functions`
8. Update the website's Content-Security-Policy (firebase.json) for Firebase and
   reCAPTCHA, test on a preview channel (`firebase hosting:channel:deploy test`),
   then set `VITE_REGISTRATION_OPEN=true` and deploy hosting.
