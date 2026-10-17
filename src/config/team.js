import { DEPARTMENTS, DEPT_ORDER } from './departments';

// Portraits (src/assets/team; details in src/assets/team/details.txt).
import benny from '../assets/team/dignitaries/DR. FR.BENNY THOMAS (DIRECTOR).jpg';
import biiju from '../assets/team/dignitaries/DR. FR. BIIJU K C (ASSOCIATE DIRECTOR).jpg';
import joby from '../assets/team/dignitaries/DR. JOBY THOMAS (DEAN).jpg';
import raghunandanDean from '../assets/team/dignitaries/DR. RAGHUNANDAN G (ASSOCIATE DEAN).jpg';
import vineeth from '../assets/team/hods/Dr VINEETH M (HOD, ECONOMICS).jpg';
import sherin from '../assets/team/hods/DR. SHERIN P ANTHONY (HOD, PSYCHOLOGY).jpg';
import vinay from '../assets/team/hods/DR. VINAY M (HOD, COMPUTER SCIENCE).jpg';
import subramani from '../assets/team/hods/Dr SUBRAMANI R (HOD, MATHEMATICS).jpg';
import sushin from '../assets/team/hods/DR. SUSHIN M (HOD, COMMERCE).jpg';
import nirmala from '../assets/team/hods/DR. NIRMALA MN (HOD, MEDIA STUDIES).jpg';
import arun from '../assets/team/hods/DR. ARUN D M (HOD, ENGLISH & CULTURAL STUDIES).jpg';
import shrinivas from '../assets/team/hods/Dr Shrinivas Kulkarni (HOD, MANAGEMENT).jpg';
import raghunandanHod from '../assets/team/hods/DR. RAGHUNANDAN G (HOD, PROFESSIONAL STUDIES).jpg';
import chiranjeevi from '../assets/team/website/Chiranjeevi P (Lead Developer & Designer).jpg';

/**
 * The people behind the fest, for the Dignitaries section of the About page (#/about).
 *
 * EDIT THIS FILE to fill in the real names. Each person is
 *   { name, role, phone?, email?, linkedin?, photo? }
 * - `phone` (10 digits), `email` and `linkedin` (profile URL) are shown only in sections with `contact: true`.
 * - `photo` (optional): a URL or an imported image; without it the card shows the
 *   person's initials in a gold medallion.
 * Names left as TBA render as "To be announced".
 */
const TBA = 'To be announced';

const fill = (n, role) => Array.from({ length: n }, () => ({ name: TBA, role }));

/** Each department's head, by department key; a department missing here shows "To be announced". */
const HODS = {
  mercury: { name: 'Dr VINEETH M', photo: vineeth },
  venus: { name: 'DR. SHERIN P ANTHONY', photo: sherin },
  earth: { name: 'DR. VINAY M', photo: vinay },
  moon: { name: 'Dr SUBRAMANI R', photo: subramani },
  mars: { name: 'DR. SUSHIN M', photo: sushin },
  jupiter: { name: 'DR. NIRMALA MN', photo: nirmala },
  saturn: { name: 'DR. ARUN D M', photo: arun },
  uranus: { name: 'Dr Shrinivas Kulkarni', photo: shrinivas },
  neptune: { name: 'DR. RAGHUNANDAN G', photo: raghunandanHod },
};

/** Heads of Departments: one per department (the planets, the Moon and the station), Cultural Events last. */
const heads = [...DEPT_ORDER.filter((k) => k !== 'station'), 'station'].map((k) => ({
  name: TBA,
  ...HODS[k],
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
      { name: 'DR. FR.BENNY THOMAS', role: 'Director', photo: benny },
      { name: 'DR. FR. BIIJU K C', role: 'Associate Director', photo: biiju },
      { name: 'DR. JOBY THOMAS', role: 'Dean', photo: joby },
      { name: 'DR. RAGHUNANDAN G', role: 'Associate Dean', photo: raghunandanDean },
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
      {
        name: 'Chiranjeevi P',
        role: 'Lead Developer & Designer',
        photo: chiranjeevi,
        phone: '7892304079',
        email: 'chiranjeevi.p@bcah.christuniversity.in',
        linkedin: 'https://www.linkedin.com/in/chiranjeevi-purushotham/',
      },
      { name: TBA, role: 'Developer' },
      { name: TBA, role: 'Designer' },
      { name: TBA, role: 'Developer' },
    ],
  },
];

export const isTBA = (p) => !p.name || p.name === TBA;

/** The website's builder (the first Website Team card), for the chatbot's "who built you?". */
export const WEB_LEAD = TEAM_SECTIONS.find((s) => s.key === 'web').people[0];
