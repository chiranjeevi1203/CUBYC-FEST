/*
 * SAMPLE participants and open teams, standing in for the server so team
 * building can be tried before the backend exists. In the real system the
 * server looks these up from everyone who has registered.
 *
 * person: { name, pass: 'verified' | 'pending', events: [slug, …] } — whether
 * they've paid (a note only: anyone with an ID can join a team) and the events
 * they already hold, used for the time-clash check.
 */
export const PEOPLE = {
  'CB27-7K4Q': { name: 'Rahul Sharma', pass: 'verified', events: ['case-404'] },
  'CB27-M8KQ': { name: 'Ananya Reddy', pass: 'verified', events: [] },
  'CB27-4XWT': { name: 'Ishita Rao', pass: 'verified', events: ['air-crash'] },
  'CB27-2PZC': { name: 'Meera Iyer', pass: 'verified', events: ['plot-twist-pop-culture-quiz'] },
  'CB27-HV6E': { name: 'Arjun Nair', pass: 'verified', events: [] },
  'CB27-9NRD': { name: 'Kabir Shah', pass: 'pending', events: [] },
};

/** Teams other participants have created, which you can join with their team code. */
export const OPEN_TEAMS = {
  'TM-8F2K': { slug: 'meme-battle', leader: 'CB27-M8KQ', members: ['CB27-M8KQ', 'CB27-HV6E'] },
  'TM-Q7WD': { slug: 'escape-room', leader: 'CB27-2PZC', members: ['CB27-2PZC'] },
};
