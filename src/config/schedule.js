import { EVENT } from './experience';

/**
 * The fest's two-day flight plan. PLACEHOLDER content — replace each day's
 * `items` with the confirmed programme (time, title, venue, tag).
 */
export const SCHEDULE_DAYS = [
  {
    key: 'day1',
    label: 'Day 01',
    date: EVENT.days[0],
    title: 'Ignition',
    items: [
      { time: '08:30', title: 'Registration & Check-in', venue: 'Main Block Atrium', tag: 'All' },
      { time: '09:00', title: 'Opening Ceremony', venue: 'Auditorium', tag: 'CUBYC' },
      { time: '09:00', title: '6-Hour Filmithon · Theme Reveal', venue: 'Media Studio', tag: 'Media Studies' },
      { time: '10:30', title: 'Department Prelims Begin', venue: 'Across Campus', tag: 'All Departments' },
      { time: '11:30', title: 'Best Manager · Round 1', venue: 'Seminar Hall 1', tag: 'Commerce' },
      { time: '13:00', title: 'Lunch Break', venue: 'Food Court', tag: 'All' },
      { time: '14:00', title: 'Transwarp Protocol · CTF', venue: 'Computer Lab 3', tag: 'Computer Science' },
      { time: '16:00', title: 'Battle of Bands · Western', venue: 'Open Air Stage', tag: 'Cultural Events' },
      { time: '18:00', title: 'Day 1 Wrap-up', venue: 'Auditorium', tag: 'CUBYC' },
    ],
  },
  {
    key: 'day2',
    label: 'Day 02',
    date: EVENT.days[1],
    title: 'Escape Velocity',
    items: [
      { time: '09:00', title: 'Day 2 Check-in', venue: 'Main Block Atrium', tag: 'All' },
      { time: '09:30', title: 'Best Manager · Stage Final', venue: 'Auditorium', tag: 'Commerce' },
      { time: '10:30', title: 'HR Shark Tank', venue: 'Seminar Hall 2', tag: 'Commerce' },
      { time: '11:30', title: 'Literature Court Room', venue: 'Moot Court Hall', tag: 'English' },
      { time: '13:00', title: 'Lunch Break', venue: 'Food Court', tag: 'All' },
      { time: '14:00', title: 'Department Finals', venue: 'Across Campus', tag: 'All Departments' },
      { time: '16:00', title: 'Indian Group Dance', venue: 'Open Air Stage', tag: 'Cultural Events' },
      { time: '17:30', title: 'Prize Distribution', venue: 'Auditorium', tag: 'CUBYC' },
      { time: '18:30', title: 'Closing Ceremony', venue: 'Auditorium', tag: 'CUBYC' },
    ],
  },
];
