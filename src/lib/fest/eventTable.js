import { EVENT_SCHEDULE } from '../../config/schedule';
import { CATALOG } from '../registration/catalog';
import { CLASH_BUFFER_MIN } from '../registration/rules';
import { eventBlocks } from './blocks';

/**
 * slug → { b: time blocks, team, min, max } — the same table scripts/build-rules.mjs
 * writes into firestore.rules (run it after any schedule change, then deploy the rules).
 */
export const EVENT_TABLE = Object.fromEntries(
  Object.keys(CATALOG).map((slug) => {
    const c = CATALOG[slug];
    return [slug, { b: eventBlocks(slug, EVENT_SCHEDULE, CLASH_BUFFER_MIN), team: Boolean(c.team_event), min: c.team?.min ?? 1, max: c.team?.max ?? 1 }];
  }),
);

/** Which of your registrations (if any) takes the same time as this event. */
export function clashOf(slug, regs) {
  const mine = new Map();
  for (const r of regs) if (r.slug !== slug) for (const b of EVENT_TABLE[r.slug]?.b ?? []) mine.set(b, r.slug);
  for (const b of EVENT_TABLE[slug]?.b ?? []) if (mine.has(b)) return mine.get(b);
  return null;
}
