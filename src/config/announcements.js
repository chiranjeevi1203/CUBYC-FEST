/**
 * Announcements every participant sees on their dashboard, newest first.
 * The organisers edit this list (later: from the admin panel).
 *   date    'YYYY-MM-DD'
 *   tag     a short label: 'General' | 'Registrations' | 'Schedule' | 'Rules' …
 *   pinned  true keeps it at the top
 */
export const ANNOUNCEMENTS = [
  {
    id: 'welcome',
    date: '2026-11-02',
    tag: 'General',
    pinned: true,
    title: "Welcome aboard CUBYC — FEST'2027",
    body: 'Your CUBYC ID is ready. Pick as many events as you like — every one is open to all — and pay the ₹500 fest pass on the bank portal. Your registration counts once the payment is verified.',
  },
  {
    id: 'schedule',
    date: '2026-11-02',
    tag: 'Schedule',
    title: 'The full and final schedule is out',
    body: 'Every event now has its day, time and venue. Two events at the same time can’t both be registered — the Events page flags any clash before you sign up.',
  },
  {
    id: 'teams',
    date: '2026-11-01',
    tag: 'Registrations',
    title: 'Building a team? Share your team code',
    body: 'Team leaders add members by their CUBYC ID, or share the team code so members can join themselves. Every member needs their own CUBYC ID and fest pass payment.',
  },
];
