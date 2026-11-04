import { create } from 'zustand';
import { CATALOG, SLOTS } from '../lib/registration/catalog';
import { findClashes } from '../lib/registration/rules.js';
import { OPEN_TEAMS, PEOPLE } from '../lib/fest/directory';
import { randomCode } from './useAuth';

/*
 * A participant's event registrations and teams. A STAND-IN for the server
 * (kept in this browser, per account); the dashboard only calls these actions.
 *
 * regs:  [{ slug, kind: 'individual' | 'team', teamId? }]
 * teams: { [teamId]: { id, code, slug, leader, members: [{ cubycId, name }] } }
 *
 * Every rule that matters runs here too: one entry per event, team sizes, and
 * no two events at the same time — for you and for every teammate. Anyone with
 * a CUBYC ID can register; the registration counts once their payment is
 * verified.
 */

const keyFor = (email) => `cubyc-fest-${email}`;
const empty = { regs: [], teams: {} };
const read = (email) => {
  try {
    return JSON.parse(localStorage.getItem(keyFor(email)) ?? 'null') ?? empty;
  } catch {
    return empty;
  }
};

const nameOf = (s) => CATALOG[s]?.name ?? s;

/** Clashes between `slug` and the events in `held`: [{ with: slug, message }]. */
export function clashesWith(slug, held) {
  const { clashes } = findClashes([slug, ...held.filter((h) => h !== slug)], SLOTS);
  return clashes.filter((c) => c.a === slug || c.b === slug).map((c) => (c.a === slug ? c.b : c.a));
}

/** Check one teammate for a team event. Returns { ok, person, error }. */
export function checkMember(id, slug, { self, taken = [] }) {
  const cid = String(id).trim().toUpperCase();
  if (!/^CB27-[2-9A-HJ-NP-Z]{4}([2-9A-HJ-NP-Z]{2})?$/.test(cid)) return { ok: false, error: 'Enter a CUBYC ID like CB27-7K4Q.' };
  if (cid === self) return { ok: false, error: "That's your own ID — you're already in as the leader." };
  if (taken.includes(cid)) return { ok: false, error: 'Already added to this team.' };
  const person = PEOPLE[cid];
  if (!person) return { ok: false, error: 'No participant with this CUBYC ID yet. Ask them to register first.' };
  if (person.events.includes(slug)) return { ok: false, person, error: `${person.name} is already registered for ${nameOf(slug)} in another team.` };
  const clash = clashesWith(slug, person.events);
  if (clash.length)
    return {
      ok: false,
      person,
      error: `${person.name} is already registered for ${nameOf(clash[0])} at the same time. Please verify with them before adding them.`,
    };
  return {
    ok: true,
    person: { cubycId: cid, name: person.name },
    note: person.pass === 'verified' ? '' : `${person.name} hasn't paid for their fest pass yet — remind them, so the team's entry counts.`,
  };
}

export const useFest = create((set, get) => ({
  email: null,
  ...empty,

  /** Load the signed-in participant's registrations. */
  load: (email) => set({ email, ...(email ? read(email) : empty) }),

  _save: (next) => {
    const { email } = get();
    set(next);
    try {
      if (email) localStorage.setItem(keyFor(email), JSON.stringify({ regs: get().regs, teams: get().teams }));
    } catch {
      /* storage blocked: kept for this visit */
    }
  },

  held: () => get().regs.map((r) => r.slug),

  addIndividual: (slug) => {
    const { regs, held, _save } = get();
    if (held().includes(slug) || clashesWith(slug, held()).length) return false;
    _save({ regs: [...regs, { slug, kind: 'individual' }] });
    return true;
  },

  /** Create a team as its leader. members: [{ cubycId, name }] (excluding the leader). */
  createTeam: (slug, leader, members) => {
    const { regs, teams, held, _save } = get();
    const ev = CATALOG[slug];
    if (held().includes(slug) || clashesWith(slug, held()).length) return { ok: false, error: 'You already have an event at this time.' };
    if (members.length + 1 > ev.team.max) return { ok: false, error: `This event allows at most ${ev.team.max} members.` };
    const id = `T-${randomCode(4)}`;
    const team = { id, code: `TM-${randomCode(4)}`, slug, leader: leader.cubycId, members: [leader, ...members] };
    _save({ regs: [...regs, { slug, kind: 'team', teamId: id }], teams: { ...teams, [id]: team } });
    return { ok: true, team };
  },

  /** Add more members to a team you lead. */
  addMember: (teamId, member) => {
    const { teams, _save } = get();
    const t = teams[teamId];
    if (!t || t.members.length >= CATALOG[t.slug].team.max) return false;
    _save({ teams: { ...teams, [teamId]: { ...t, members: [...t.members, member] } } });
    return true;
  },

  /** Join someone else's team with its code. */
  joinTeam: (code, me) => {
    const c = String(code).trim().toUpperCase();
    const open = OPEN_TEAMS[c];
    const { regs, teams, held, _save } = get();
    if (!open) return { ok: false, error: 'No team with this code. Check it with your team leader.' };
    const ev = CATALOG[open.slug];
    if (held().includes(open.slug)) return { ok: false, error: `You're already registered for ${ev.name}.` };
    const clash = clashesWith(open.slug, held());
    if (clash.length) return { ok: false, error: `${ev.name} clashes with ${nameOf(clash[0])}, which you're already registered for.` };
    if (open.members.length >= ev.team.max) return { ok: false, error: 'This team is already full.' };
    const id = `T-${c.slice(3)}`;
    const team = {
      id,
      code: c,
      slug: open.slug,
      leader: open.leader,
      members: [...open.members.map((m) => ({ cubycId: m, name: PEOPLE[m]?.name ?? m })), { cubycId: me.cubycId, name: me.name }],
    };
    _save({ regs: [...regs, { slug: open.slug, kind: 'team', teamId: id }], teams: { ...teams, [id]: team } });
    return { ok: true, team };
  },

  /** Withdraw from an event (leaving or disbanding its team). */
  withdraw: (slug) => {
    const { regs, teams, _save } = get();
    const r = regs.find((x) => x.slug === slug);
    const nextTeams = { ...teams };
    if (r?.teamId) delete nextTeams[r.teamId];
    _save({ regs: regs.filter((x) => x.slug !== slug), teams: nextTeams });
  },
}));
