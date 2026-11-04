/**
 * Time blocks: each day of the schedule is cut at every event's start and at
 * every event's end plus the changeover buffer. An event covers the blocks
 * inside its time; two events clash exactly when they share a block.
 *
 * The same blocks are written into firestore.rules (scripts/build-rules.mjs),
 * where they guard every booking: one person, one block, one event.
 */
const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const hhmm = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}${String(n % 60).padStart(2, '0')}`;

/** schedule: slug → [{ day, start, end }]  →  day → sorted cut points (minutes). */
function cuts(schedule, buffer) {
  const byDay = {};
  for (const slots of Object.values(schedule))
    for (const s of slots) {
      (byDay[s.day] ??= new Set()).add(minutes(s.start));
      byDay[s.day].add(minutes(s.end) + buffer);
    }
  return Object.fromEntries(Object.entries(byDay).map(([d, set]) => [d, [...set].sort((a, b) => a - b)]));
}

const memo = new WeakMap();

/** An event's blocks, e.g. ['d1-1030', 'd1-1315']. */
export function eventBlocks(slug, schedule, buffer) {
  let c = memo.get(schedule);
  if (!c) memo.set(schedule, (c = cuts(schedule, buffer)));
  const out = [];
  for (const s of schedule[slug] ?? []) {
    const b = c[s.day];
    for (let i = 0; i < b.length - 1; i++) if (b[i] >= minutes(s.start) && b[i + 1] <= minutes(s.end) + buffer) out.push(`d${s.day}-${hhmm(b[i])}`);
  }
  return out;
}
