/**
 * The fest's general rules (provisional — confirm with the organising committee).
 * Wrap a key phrase in **double asterisks** to highlight it on the hologram.
 * Event-specific rules live with each event in ./departments.js.
 */
export const RULE_SECTIONS = [
  {
    key: 'entry',
    title: 'Eligibility & Registration',
    rules: [
      'A **valid college ID card is mandatory** for entry on both days of the fest.',
      'Registrations are **confirmed only after the official form is completed** and acknowledged by the organisers.',
      'Register **before the published deadline**. Changes to registered participants need **prior approval**.',
      'Team sizes must match each event’s format. Teams that don’t meet the requirement **may not be allowed to compete**.',
    ],
  },
  {
    key: 'reporting',
    title: 'Reporting & Timings',
    rules: [
      'Participants must **arrive at their venue 15 minutes before** the reporting time.',
      'Late arrivals, absences or withdrawals **may result in forfeiture or disqualification**.',
      'Schedules and venues may change — follow **announcements from the organisers** on the day.',
    ],
  },
  {
    key: 'competition',
    title: 'Competition',
    rules: [
      'Event-specific rules are published on **each event’s page** and are **final**.',
      '**The judges’ decision is final** and binding in all matters of evaluation.',
      'All work must be **original**. Plagiarism, or using AI where an event prohibits it, **leads to disqualification**.',
      'Use of phones, laptops and other devices is allowed **only where an event’s rules permit it**.',
      'Complaints must be raised **promptly, by the team captain**, with the event coordinator.',
    ],
  },
  {
    key: 'conduct',
    title: 'Conduct',
    rules: [
      '**Respectful conduct is expected at all times** — towards participants, volunteers, faculty and guests.',
      'Harassment, discrimination, abusive language or deliberate disruption is **strictly prohibited**.',
      'Content in performances and submissions must be free of **vulgarity and hateful material**.',
      'Violations may bring **warnings, point deductions or disqualification**, at the organisers’ discretion.',
    ],
  },
  {
    key: 'safety',
    title: 'Campus & Safety',
    rules: [
      'Follow **all safety instructions** and use university property responsibly.',
      'Report injuries or unsafe conditions to the nearest volunteer **immediately**.',
      'The organising committee **may modify or suspend events** for safety or regulatory reasons.',
      '**The organisers’ decision is final** on any matter not covered by these rules.',
    ],
  },
];

export const RULE_COUNT = RULE_SECTIONS.reduce((n, s) => n + s.rules.length, 0);
