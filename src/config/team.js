import { DEPARTMENTS, DEPT_ORDER } from './departments';

/**
 * The people behind the fest, for the Dignitaries section of the About page (#/about).
 *
 * EDIT THIS FILE to fill in the real names. Each person is
 *   { name, role, phone?, email?, photo? }
 * - `phone` (10 digits) and `email` are shown only in sections with `contact: true`.
 * - `photo` (optional): a URL or an imported image; without it the card shows the
 *   person's initials in a gold medallion.
 * Names left as TBA render as "To be announced".
 */
const TBA = 'To be announced';

const fill = (n, role) => Array.from({ length: n }, () => ({ name: TBA, role }));

/** Heads of Departments: one per department (the planets, the Moon and the station). */
const heads = DEPT_ORDER.filter((k) => !DEPARTMENTS[k].hub).map((k) => ({
  name: TBA,
  role: `Head of Department · ${DEPARTMENTS[k].name}`,
}));

/**
 * `cols` = cards per row on wide screens. `plain` drops the ornate card border
 * (only Dignitaries and Heads keep it). `featured` highlights a section.
 * Keys are also used by the Contact page (faculty-core, student-committee) and
 * the landing page (student-core).
 */
export const TEAM_SECTIONS = [
  {
    key: 'dignitaries',
    title: 'Dignitaries',
    kicker: 'Guiding stars',
    contact: false,
    cols: 4,
    people: [
      { name: TBA, role: 'Father · Director' },
      { name: TBA, role: 'Dean' },
      { name: TBA, role: 'Associate Dean' },
      { name: TBA, role: 'Dignitary' },
    ],
  },
  {
    key: 'heads',
    title: 'Heads of Departments',
    kicker: 'Keepers of the worlds',
    contact: false,
    cols: 5,
    people: heads,
  },
  {
    key: 'faculty-core',
    title: 'Core Faculty',
    kicker: 'Mission control',
    contact: true,
    cols: 6,
    plain: true,
    people: fill(6, 'Core Faculty'),
  },
  {
    key: 'student-committee',
    title: 'Core Students',
    kicker: 'The command deck',
    contact: true,
    cols: 6,
    plain: true,
    people: fill(6, 'Core Student'),
  },
  {
    key: 'faculty-members',
    title: 'Faculty',
    kicker: 'Flight crew of every world',
    contact: true,
    cols: 6,
    plain: true,
    people: fill(6, 'Faculty Member'),
  },
  {
    key: 'student-core',
    title: 'Students',
    kicker: 'Crew on every deck',
    contact: true,
    cols: 6,
    plain: true,
    people: fill(6, 'Student Member'),
  },
  {
    key: 'web',
    title: 'Website Team',
    kicker: 'Builders of this orbit',
    contact: true,
    cols: 4,
    plain: true,
    featured: true,
    people: [
      { name: TBA, role: 'Lead Developer' },
      { name: TBA, role: 'Developer' },
      { name: TBA, role: 'Designer' },
      { name: TBA, role: 'Developer' },
    ],
  },
];

export const isTBA = (p) => !p.name || p.name === TBA;
