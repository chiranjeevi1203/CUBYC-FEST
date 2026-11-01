import { EVENT } from './experience';
import { DEPARTMENTS, DEPT_ORDER, eventSlug } from './departments';

/**
 * The fest's two-day flight plan — the full and final schedule.
 *
 * Each slot: start / end in 24-hour time, a title, a venue, and `event` (the
 * event's slug) when it is one of the fest's events. The event pages, the
 * schedule page, the landing teaser, the chatbot and the registration clash
 * check all read from here, so a change here updates them everywhere.
 */

const DEPT_OF = Object.fromEntries(DEPT_ORDER.flatMap((k) => DEPARTMENTS[k].events.map((e) => [eventSlug(e.name), DEPARTMENTS[k].name])));

/** '13:30' → '1:30 PM' */
export function clock(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** A slot. Event slots carry their department as the tag; fest-wide slots are tagged 'All' / 'CUBYC'. */
const slot = (start, end, title, venue, event = null, tag = null) => ({
  start,
  end,
  time: `${clock(start)} – ${clock(end)}`,
  title,
  venue,
  event,
  tag: tag ?? (event ? DEPT_OF[event] : 'CUBYC'),
});

const byStart = (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end);

export const SCHEDULE_DAYS = [
  {
    key: 'day1',
    label: 'Day 01',
    date: EVENT.days[0],
    title: 'Ignition',
    items: [
      slot('08:00', '09:00', 'Registration & Reporting', 'In front of the Turf', null, 'All'),
      slot('09:00', '10:30', 'Inauguration', 'Main Auditorium'),
      slot('10:30', '13:00', 'Sustain-A-Quest (Best Manager)', 'B-614, B-613 (B-611)', 'best-manager-sustainaquest'),
      slot('10:30', '13:00', 'Air Crash', 'C-616, C-615', 'air-crash'),
      slot('10:30', '13:00', 'Literature Court Room', 'Seminar Hall 1, A-Block', 'literature-court-room'),
      slot('10:30', '13:00', 'Case 404', 'Nexus Commons', 'case-404'),
      slot('10:30', '13:00', 'Brain to Brand', 'Seminar Hall, B-Block', 'brain-to-brand-pitching-event'),
      slot('10:30', '13:00', 'Battle of Bands · Western', 'KEC Auditorium', 'battle-of-bands-western'),
      slot('10:30', '13:00', 'Street Play', 'Grand Portico', 'street-play'),
      slot('10:30', '17:00', '6-Hour Filmithon', 'Seminar Hall, C-Block', '6-hour-filmithon'),
      slot('10:30', '17:00', 'Prime Prompt (AI Battle of Prompts)', 'Assembly Hall, A-Block', 'prime-prompt-ai-battle-of-prompts'),
      slot('14:00', '17:30', 'Monomatics', 'Peacock Circle', 'monomatics'),
      slot('14:30', '17:00', 'Plot Twist', 'Seminar Hall 2, A-Block', 'plot-twist-pop-culture-quiz'),
      slot('14:30', '17:00', 'Cybertronian Wars', 'C-616, C-615 (B-610)', 'cybertronian-wars-gaming'),
      slot('14:30', '17:00', 'Indian Film and Folk Dance Solo', 'KEC Auditorium', 'indian-film-and-folk-dance-solo'),
      slot('14:30', '17:30', 'Escape Room', 'B-Block 6th Floor (611, 610, 613, 614)', 'escape-room'),
      slot('18:00', '20:00', 'DJ Night', 'Venue to be announced', null, 'All'),
    ].sort(byStart),
  },
  {
    key: 'day2',
    label: 'Day 02',
    date: EVENT.days[1],
    title: 'Escape Velocity',
    items: [
      slot('08:00', '09:00', 'Registration & Reporting', 'In front of the Turf', null, 'All'),
      slot('09:00', '13:00', 'Creative Curveball', 'Seminar Hall, C-Block', 'creative-curveball'),
      slot('09:00', '13:00', 'Clash of Councils', 'Seminar Hall, B-Block', 'clash-of-councils'),
      slot('09:30', '12:00', 'Percepta (HR)', 'B-614, B-613 (B-611)', 'percepta-hr'),
      slot('09:30', '12:00', 'Convince the Time Keeper', 'C-616, C-615', 'convince-the-time-keeper'),
      slot('09:30', '12:00', 'Meme Battle', 'Seminar Hall 1, A-Block', 'meme-battle'),
      slot('09:30', '12:00', 'Indian Group Dance (Non-Theme)', 'KEC Auditorium', 'indian-group-dance-non-theme'),
      slot('09:30', '12:00', 'Mime', 'Grand Portico', 'mime'),
      slot('13:30', '16:00', 'Crack the Psyche', 'Nexus Commons', 'crack-the-psyche'),
      slot('13:30', '16:00', 'Bulls and Bears', 'Seminar Hall 2, A-Block', 'bulls-and-bears-mock-stock'),
      slot('13:30', '16:00', 'Transwarp Protocol', 'B-611, B-610', 'transwarp-protocol-capture-the-flag'),
      slot('13:30', '16:00', 'Auction Sudoku', 'Seminar Hall, B-Block', 'auction-sudoku'),
      slot('13:30', '16:00', 'Battle of Bands · Indian', 'KEC Auditorium', 'battle-of-bands-indian'),
      slot('13:30', '16:00', 'Capture the Assets', 'Peacock Circle', 'capture-the-assets'),
      slot('17:00', '19:00', 'Valedictory', 'Main Auditorium'),
    ].sort(byStart),
  },
];

/**
 * The schedule slots of an event, for its details page:
 * [{ day, date, time, venue, title, start, end, dayNo }].
 */
export function scheduleFor(eventName) {
  const slug = eventSlug(eventName);
  const out = [];
  SCHEDULE_DAYS.forEach((day, i) =>
    day.items.forEach((it) => {
      if (it.event === slug) out.push({ day: day.label, date: day.date, time: it.time, venue: it.venue, title: it.title, start: it.start, end: it.end, dayNo: i + 1 });
    }),
  );
  return out;
}

/** Every event's slots in the shape the registration clash check uses: slug → [{ day, start, end }]. */
export const EVENT_SCHEDULE = SCHEDULE_DAYS.reduce((acc, day, i) => {
  day.items.forEach((it) => {
    if (it.event) (acc[it.event] ??= []).push({ day: i + 1, start: it.start, end: it.end });
  });
  return acc;
}, {});
