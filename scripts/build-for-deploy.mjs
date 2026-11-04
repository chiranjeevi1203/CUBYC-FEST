/**
 * Firebase Hosting runs this before every deploy (firebase.json → predeploy).
 *   firebase deploy --only hosting                         → production build (registration as set in .env.production.local)
 *   CUBYC_BUILD_MODE=staging firebase hosting:channel:deploy test → staging build (.env.staging.local) for a private preview
 */
import { execSync } from 'node:child_process';

const mode = process.env.CUBYC_BUILD_MODE || 'production';
if (!/^[a-z]+$/.test(mode)) throw new Error(`Bad build mode: ${mode}`);
console.log(`Building the site in "${mode}" mode…`);
execSync(`npm run build -- --mode ${mode}`, { stdio: 'inherit' });
