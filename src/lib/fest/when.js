import { SCHEDULE_DAYS } from '../../config/schedule';

/** Every scheduled event slot: [{ slug, dayNo, day, date, start, end, time, venue }], in time order. */
export const EVENT_SLOTS_LIST = SCHEDULE_DAYS.flatMap((d, i) =>
  d.items.filter((it) => it.event).map((it) => ({ slug: it.event, dayNo: i + 1, day: d.label, date: d.date, start: it.start, end: it.end, time: it.time, venue: it.venue })),
);

/** An event's first slot (its day, time and venue). */
export const whenOf = (slug) => EVENT_SLOTS_LIST.find((s) => s.slug === slug) ?? null;

/** Sort key: day, then start time. */
export const whenKey = (slug) => {
  const w = whenOf(slug);
  return w ? `${w.dayNo}-${w.start}` : '9-99:99';
};
