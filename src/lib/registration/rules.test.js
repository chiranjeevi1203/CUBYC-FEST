// Run: npm test   (Node's built-in test runner; no extra packages)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEPARTMENTS, DEPT_ORDER, eventSlug } from '../../config/departments.js';
import { FEES, buildCatalog, checkCart, checkContingent, checkTeamJoin, findClashes, parseTeamSize, slotsClash, teamStatus, tierOf } from './rules.js';

/* ---------- a small made-up fest for the rule tests ---------- */
const EVENTS = [
  { slug: 'quiz', name: 'Quiz', format: 'Individual' },
  { slug: 'debate', name: 'Debate', format: 'Individual' },
  { slug: 'duo', name: 'Duo Code', format: 'Team of 2' },
  { slug: 'trio', name: 'Trio Hunt', format: 'Team of 2–3' },
  { slug: 'quad', name: 'Quad Build', format: 'Team of 2–4' },
  { slug: 'dance', name: 'Group Dance', format: 'Team of 8–15' },
  { slug: 'squad', name: 'Squad Game', format: 'Valorant · Squad of 5 (+1)' },
  ...Array.from({ length: 14 }, (_, i) => ({ slug: `solo-${i + 1}`, name: `Solo ${i + 1}`, format: 'Individual' })),
];
const CAT = buildCatalog(EVENTS);
const SLOTS = {
  quiz: [{ day: 1, start: '10:00', end: '11:00' }],
  debate: [{ day: 1, start: '10:30', end: '12:00' }], // overlaps quiz
  duo: [{ day: 1, start: '11:10', end: '12:00' }], // 10 min after quiz ends: inside the 15-min buffer
  trio: [{ day: 1, start: '14:00', end: '15:00' }],
  quad: [{ day: 2, start: '10:00', end: '11:00' }], // same time as quiz, different day
};

test('fees match the fest tiers', () => {
  assert.deepEqual(FEES, { individual: 500, small: 1500, large: 2500, contingent: 7500 });
  assert.equal(CAT.quiz.fee, 500);
  assert.equal(CAT.duo.fee, 1500); // team of 2
  assert.equal(CAT.trio.fee, 1500); // up to 3
  assert.equal(CAT.quad.fee, 2500); // allows 4
  assert.equal(CAT.dance.fee, 2500);
  assert.equal(CAT.squad.fee, 2500); // 5 + 1 sub
});

test('team sizes are read from the format text', () => {
  assert.deepEqual(parseTeamSize('Individual'), { min: 1, max: 1 });
  assert.deepEqual(parseTeamSize('Team of 2'), { min: 2, max: 2 });
  assert.deepEqual(parseTeamSize('Team of 2–3'), { min: 2, max: 3 });
  assert.deepEqual(parseTeamSize('Team of 6 (+2 subs)'), { min: 6, max: 8 });
  assert.deepEqual(parseTeamSize('Valorant · Squad of 5 (+1)'), { min: 5, max: 6 });
  assert.deepEqual(parseTeamSize('Band of 5–10'), { min: 5, max: 10 });
  assert.deepEqual(parseTeamSize('Group · up to 5'), { min: 2, max: 5 });
  assert.equal(parseTeamSize('TBA'), null);
  assert.equal(tierOf({ format: 'Team of 2–4', feeTier: 'small' }), 'small'); // explicit override wins
});

test('every real fest event has a readable team size and a fee', () => {
  const events = DEPT_ORDER.flatMap((k) => DEPARTMENTS[k].events.map((e) => ({ ...e, slug: eventSlug(e.name) })));
  assert.ok(events.length > 0);
  for (const e of events) {
    assert.ok(parseTeamSize(e.format), `can't read the team size of “${e.name}” (${e.format})`);
  }
  const catalog = buildCatalog(events);
  for (const e of Object.values(catalog)) assert.ok([500, 1500, 2500].includes(e.fee), e.name);
});

test('cart: totals individual entries and team-leader entries', () => {
  const r = checkCart({ cart: ['quiz', 'trio', 'dance'], catalog: CAT, slots: SLOTS });
  assert.equal(r.ok, true);
  assert.equal(r.total, 500 + 1500 + 2500);
  assert.deepEqual(r.lines.map((l) => l.role), ['participant', 'leader', 'leader']);
});

test('cart: blocks clashes, inside the walking buffer too', () => {
  const r = checkCart({ cart: ['quiz', 'debate'], catalog: CAT, slots: SLOTS });
  assert.equal(r.ok, false);
  assert.equal(r.errors[0].code, 'clash');
  assert.match(r.errors[0].message, /choose either one/);
  assert.equal(checkCart({ cart: ['quiz', 'duo'], catalog: CAT, slots: SLOTS }).errors[0].code, 'clash');
  assert.equal(checkCart({ cart: ['quiz', 'trio', 'quad'], catalog: CAT, slots: SLOTS }).ok, true); // other times / day
});

test('cart: clashes with events already registered count too', () => {
  const r = checkCart({ cart: ['debate'], registered: ['quiz'], catalog: CAT, slots: SLOTS });
  assert.equal(r.errors[0].code, 'clash');
});

test('cart: no duplicates, no re-registering, no unknown events, no empty cart', () => {
  assert.equal(checkCart({ cart: ['quiz', 'quiz'], catalog: CAT }).errors[0].code, 'duplicate');
  assert.equal(checkCart({ cart: ['quiz'], registered: ['quiz'], catalog: CAT }).errors[0].code, 'already_registered');
  assert.equal(checkCart({ cart: ['nope'], catalog: CAT }).errors[0].code, 'unknown_event');
  assert.equal(checkCart({ cart: [], catalog: CAT }).ok, false);
});

test('cart: events without a time yet are allowed, with a warning', () => {
  const r = checkCart({ cart: ['dance'], catalog: CAT, slots: SLOTS });
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some((w) => w.code === 'time_not_announced'));
});

test('slots: same time on different days never clash', () => {
  assert.equal(slotsClash({ day: 1, start: '10:00', end: '11:00' }, { day: 2, start: '10:00', end: '11:00' }), false);
  assert.equal(slotsClash({ day: 1, start: '10:00', end: '11:00' }, { day: 1, start: '11:15', end: '12:00' }), false); // exactly the buffer
  assert.equal(findClashes(['quiz', 'debate', 'trio'], SLOTS).clashes.length, 1);
});

test('teams: join rules', () => {
  const ev = CAT.trio; // 2–3
  assert.equal(checkTeamJoin({ event: ev, memberCount: 1, catalog: CAT, slots: SLOTS }).ok, true);
  assert.equal(checkTeamJoin({ event: ev, memberCount: 3, catalog: CAT }).errors[0].code, 'team_full');
  assert.equal(checkTeamJoin({ event: ev, memberCount: 1, isMember: true, catalog: CAT }).errors[0].code, 'already_member');
  assert.equal(checkTeamJoin({ event: ev, memberCount: 1, registered: ['trio'], catalog: CAT }).errors[0].code, 'already_registered');
  assert.equal(checkTeamJoin({ event: CAT.quiz, memberCount: 1, catalog: CAT }).errors[0].code, 'not_team_event');
  // A member who holds a clashing event can't join.
  assert.equal(checkTeamJoin({ event: CAT.duo, memberCount: 1, registered: ['quiz'], catalog: CAT, slots: SLOTS }).errors[0].code, 'clash');
  assert.deepEqual(teamStatus(ev, 1), { status: 'incomplete', needed: 1, spots: 2 });
  assert.equal(teamStatus(ev, 2).status, 'ready');
  assert.equal(teamStatus(ev, 3).status, 'full');
});

/* ---------- contingents ---------- */
const person = (n) => ({ name: `Student ${n}`, email: `s${n}@college.edu` });
const soloRows = (count, start = 1) => Array.from({ length: count }, (_, i) => ({ ...person(100 + i), event: `Solo ${i + start}` }));
const withRows = (rows) => rows.map((r, i) => ({ row: i + 2, ...r }));

test('contingent: 10–15 different events, flat ₹7,500', () => {
  const ok = checkContingent({ rows: withRows(soloRows(10)), catalog: CAT });
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  assert.equal(ok.fee, 7500);
  assert.equal(ok.events.length, 10);
  assert.equal(checkContingent({ rows: withRows(soloRows(9)), catalog: CAT }).errors.at(-1).code, 'too_few_events');
  const many = [...soloRows(14), { ...person(1), event: 'Quiz' }, { ...person(2), event: 'Debate' }];
  assert.equal(checkContingent({ rows: withRows(many), catalog: CAT }).errors.at(-1).code, 'too_many_events');
});

test('contingent: team sizes, team names and duplicates are checked', () => {
  const base = soloRows(9);
  const trioOk = [{ ...person(1), event: 'Trio Hunt', team: 'A' }, { ...person(2), event: 'trio', team: 'a' }];
  assert.equal(checkContingent({ rows: withRows([...base, ...trioOk]), catalog: CAT }).ok, true);
  const tooBig = [...trioOk, { ...person(3), event: 'Trio Hunt', team: 'A' }, { ...person(4), event: 'Trio Hunt', team: 'A' }];
  assert.ok(checkContingent({ rows: withRows([...base, ...tooBig]), catalog: CAT }).errors.some((e) => e.code === 'team_size'));
  const noTeam = [{ ...person(1), event: 'Trio Hunt' }];
  assert.ok(checkContingent({ rows: withRows([...base, ...noTeam]), catalog: CAT }).errors.some((e) => e.code === 'missing_team'));
  const twice = [...base, { ...person(1), event: 'Quiz' }, { ...person(1), event: 'Quiz' }];
  assert.ok(checkContingent({ rows: withRows(twice), catalog: CAT }).errors.some((e) => e.code === 'duplicate_person'));
});

test('contingent: bad rows are reported with their row numbers', () => {
  const rows = withRows([...soloRows(10), { name: '', email: 'not-an-email', event: 'Quiz' }, { ...person(9), event: 'Made Up' }]);
  const r = checkContingent({ rows, catalog: CAT });
  assert.ok(r.errors.some((e) => e.code === 'bad_email' && e.row === 12));
  assert.ok(r.errors.some((e) => e.code === 'unknown_event' && e.row === 13));
});

test('contingent: one person in two clashing events is blocked', () => {
  const rows = withRows([...soloRows(8), { ...person(1), event: 'Quiz' }, { ...person(1), event: 'Debate' }]);
  const r = checkContingent({ rows, catalog: CAT, slots: SLOTS });
  assert.ok(r.errors.some((e) => e.code === 'clash'));
});
