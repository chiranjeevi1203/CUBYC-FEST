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

/** Heads of each domain, in planet order. */
const heads = DEPT_ORDER.filter((k) => !DEPARTMENTS[k].hub && k !== 'station').map((k) => ({
  name: TBA,
  role: `Head · ${DEPARTMENTS[k].name}`,
}));

/** Each domain's faculty in-charge (from config/departments.js). */
const domainTeachers = DEPT_ORDER.filter((k) => DEPARTMENTS[k].faculty).flatMap((k) =>
  DEPARTMENTS[k].faculty
    .split(/\s*&\s*/)
    .map((name) => ({ name, role: `Faculty in-charge · ${DEPARTMENTS[k].name}` })),
);

export const TEAM_SECTIONS = [
  {
    key: 'dignitaries',
    title: 'Dignitaries',
    kicker: 'Guiding stars',
    contact: false,
    people: [
      { name: TBA, role: 'Father · Director' },
      { name: TBA, role: 'Dean' },
      { name: TBA, role: 'Associate Dean' },
    ],
  },
  {
    key: 'heads',
    title: 'Heads of Domains',
    kicker: 'Keepers of the worlds',
    contact: false,
    people: heads,
  },
  {
    key: 'faculty-core',
    title: 'Faculty Core Members',
    kicker: 'Mission control',
    contact: true,
    people: [
      { name: TBA, role: 'Faculty Coordinator' },
      { name: TBA, role: 'Faculty Coordinator' },
      { name: TBA, role: 'Faculty Coordinator' },
    ],
  },
  {
    key: 'domain-teachers',
    title: 'Domain Core Teachers',
    kicker: 'Flight crew of every world',
    contact: true,
    people: domainTeachers,
  },
  {
    key: 'student-committee',
    title: 'Student Core Committee',
    kicker: 'The command deck',
    contact: true,
    people: [
      { name: TBA, role: 'Student Convenor' },
      { name: TBA, role: 'Student Co-Convenor' },
      { name: TBA, role: 'Secretary' },
    ],
  },
  {
    key: 'student-core',
    title: 'Student Core Members',
    kicker: 'Crew on every deck',
    contact: true,
    people: [
      { name: TBA, role: 'Core Member' },
      { name: TBA, role: 'Core Member' },
      { name: TBA, role: 'Core Member' },
    ],
  },
  {
    key: 'web',
    title: 'Website Dev Team',
    kicker: 'Builders of this orbit',
    contact: true,
    people: [
      { name: TBA, role: 'Lead Developer' },
      { name: TBA, role: 'Developer' },
      { name: TBA, role: 'Designer' },
    ],
  },
];

export const isTBA = (p) => !p.name || p.name === TBA;
