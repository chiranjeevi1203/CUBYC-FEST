/**
 * Registration rules for CUBYC — FEST'2027: fees, team sizes, the cart, team
 * joins, schedule clashes and contingent rosters.
 *
 * Pure functions with no browser or Vite dependencies, so the website (to show
 * totals and warnings) and the server (which has the final say on every price
 * and rule) run exactly the same logic. Nothing here trusts a total or a status
 * sent by the browser: callers pass in the event catalog and the user's real
 * registrations, and these functions compute everything from those.
 *
 * Every check returns { ok, errors, warnings, ... }. An error blocks the action;
 * a warning is shown but doesn't block.
 */

/* -------------------------------------------------------------------------- */
/*  Fees and limits                                                           */
/* -------------------------------------------------------------------------- */

/** Registration fee per tier, in rupees. */
export const FEES = Object.freeze({
  individual: 500, // per person
  small: 1500, // per team of up to 3
  large: 2500, // per team of 4 or more
  contingent: 7500, // per contingent (a whole college's batch)
});

/** Teams whose largest allowed size is this or less pay the small-team fee. */
export const SMALL_TEAM_MAX = 3;

/** A contingent must enter at least this many, and at most this many, different events. */
export const CONTINGENT_EVENTS = Object.freeze({ min: 10, max: 15 });

/** Minutes kept free between two events, to get from one venue to the next. */
export const CLASH_BUFFER_MIN = 15;

export const TIER_LABEL = Object.freeze({
  individual: 'Individual',
  small: 'Team of up to 3',
  large: 'Team of 4 or more',
});

/* -------------------------------------------------------------------------- */
/*  Team size and fee tier of an event                                        */
/* -------------------------------------------------------------------------- */

/**
 * Team size from an event's format text: { min, max } members, substitutes
 * included in max. null if the text can't be read (set `team` on the event then).
 *   "Individual" → 1–1 · "Team of 2" → 2–2 · "Team of 2–3" → 2–3
 *   "Team of 6 (+2 subs)" → 6–8 · "Valorant · Squad of 5 (+1)" → 5–6
 *   "Band of 5–10" → 5–10 · "Group · up to 5" → 2–5
 */
export function parseTeamSize(format) {
  const text = String(format ?? '').toLowerCase();
  if (/\bindividual\b|\bsolo\b/.test(text)) return { min: 1, max: 1 };
  const upTo = text.match(/up to\s*(\d+)/);
  if (upTo) return { min: 2, max: Number(upTo[1]) };
  const range = text.match(/(\d+)\s*[–—-]\s*(\d+)/);
  const single = text.match(/(\d+)/);
  if (!range && !single) return null;
  let min = Number(range ? range[1] : single[1]);
  let max = Number(range ? range[2] : single[1]);
  const subs = text.match(/\+\s*(\d+)/);
  if (subs) max += Number(subs[1]);
  if (min > max) [min, max] = [max, min];
  return { min, max };
}

/** An event's team size: an explicit `team: { min, max }` wins over the format text. */
export const teamSizeOf = (event) => event.team ?? parseTeamSize(event.format);

/**
 * Fee tier of an event, decided by the LARGEST team it allows (the leader pays
 * when registering, before every member has joined): 1 → individual, up to 3 →
 * small, 4 or more → large. An explicit `feeTier` on the event overrides this.
 */
export function tierOf(event) {
  if (event.feeTier) return event.feeTier;
  const size = teamSizeOf(event);
  if (!size || size.max <= 1) return 'individual';
  return size.max <= SMALL_TEAM_MAX ? 'small' : 'large';
}

export const feeOf = (event) => FEES[tierOf(event)];
export const isTeamEvent = (event) => tierOf(event) !== 'individual';

/**
 * The catalog the rules work from: every event keyed by slug, with its team
 * size, tier and fee worked out once. `events` need { slug, name, format } and
 * may carry `team` / `feeTier` overrides.
 */
export function buildCatalog(events) {
  const catalog = {};
  for (const e of events) {
    const team = teamSizeOf(e);
    const tier = tierOf(e);
    catalog[e.slug] = { slug: e.slug, name: e.name, dept: e.dept, format: e.format, team, tier, fee: FEES[tier], team_event: tier !== 'individual' };
  }
  return catalog;
}

/* -------------------------------------------------------------------------- */
/*  Schedule clashes                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Slots are { day: 1 | 2, start: 'HH:MM', end: 'HH:MM' } (an event can have
 * several, e.g. a prelim and a final). `slots` maps slug → [slot, …].
 */
const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Do two slots overlap, allowing `buffer` minutes to move between venues? */
export function slotsClash(a, b, buffer = CLASH_BUFFER_MIN) {
  if (Number(a.day) !== Number(b.day)) return false;
  const [a0, a1, b0, b1] = [toMinutes(a.start), toMinutes(a.end), toMinutes(b.start), toMinutes(b.end)];
  return a0 < b1 + buffer && b0 < a1 + buffer;
}

const fmtSlot = (s) => `Day ${s.day}, ${s.start}–${s.end}`;

/**
 * Every clashing pair among a set of events: [{ a, b, slotA, slotB }].
 * Events with no time yet can't be checked; they are listed in `unscheduled`.
 */
export function findClashes(slugs, slots, buffer = CLASH_BUFFER_MIN) {
  const unique = [...new Set(slugs)];
  const clashes = [];
  const unscheduled = unique.filter((s) => !slots[s]?.length);
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const A = slots[unique[i]] ?? [];
      const B = slots[unique[j]] ?? [];
      const hit = A.flatMap((sa) => B.filter((sb) => slotsClash(sa, sb, buffer)).map((sb) => [sa, sb]))[0];
      if (hit) clashes.push({ a: unique[i], b: unique[j], slotA: hit[0], slotB: hit[1] });
    }
  }
  return { clashes, unscheduled };
}

const clashMessage = (c, catalog) =>
  `“${catalog[c.a]?.name ?? c.a}” (${fmtSlot(c.slotA)}) clashes with “${catalog[c.b]?.name ?? c.b}” (${fmtSlot(c.slotB)}). You can take part in only one of them — please choose either one.`;

/* -------------------------------------------------------------------------- */
/*  Cart (individual entries and team-leader entries)                        */
/* -------------------------------------------------------------------------- */

/**
 * Check a participant's cart and price it.
 *   cart        slugs the user wants to register for. Individual events register
 *               them; team events register them as the team's leader (one fee
 *               per team, paid by the leader).
 *   registered  slugs they already hold (paid, pending, or joined as a member).
 * Returns { ok, lines, total, errors, warnings, clashes }.
 */
export function checkCart({ cart, registered = [], catalog, slots = {} }) {
  const errors = [];
  const warnings = [];
  const lines = [];
  const seen = new Set();

  for (const slug of cart) {
    const ev = catalog[slug];
    if (!ev) {
      errors.push({ code: 'unknown_event', slug, message: `“${slug}” is not an event in this fest.` });
      continue;
    }
    if (seen.has(slug)) {
      errors.push({ code: 'duplicate', slug, message: `“${ev.name}” is in your cart twice.` });
      continue;
    }
    seen.add(slug);
    if (registered.includes(slug)) {
      errors.push({ code: 'already_registered', slug, message: `You are already registered for “${ev.name}”.` });
      continue;
    }
    lines.push({
      slug,
      name: ev.name,
      tier: ev.tier,
      role: ev.team_event ? 'leader' : 'participant',
      team: ev.team,
      fee: ev.fee,
    });
  }

  // Clashes among the cart, and between the cart and what they already hold.
  const cartSlugs = lines.map((l) => l.slug);
  const { clashes, unscheduled } = findClashes([...cartSlugs, ...registered], slots);
  const relevant = clashes.filter((c) => cartSlugs.includes(c.a) || cartSlugs.includes(c.b));
  relevant.forEach((c) => errors.push({ code: 'clash', slugs: [c.a, c.b], message: clashMessage(c, catalog) }));

  const pendingTimes = unscheduled.filter((s) => cartSlugs.includes(s));
  if (pendingTimes.length) {
    warnings.push({
      code: 'time_not_announced',
      slugs: pendingTimes,
      message: `Times are not announced yet for: ${pendingTimes.map((s) => catalog[s]?.name ?? s).join(', ')}. We'll flag any clash as soon as the schedule is final.`,
    });
  }
  lines
    .filter((l) => l.role === 'leader')
    .forEach((l) =>
      warnings.push({
        code: 'team_leader',
        slug: l.slug,
        message: `You'll be the team leader for “${l.name}” (team of ${l.team.min === l.team.max ? l.team.min : `${l.team.min}–${l.team.max}`}). After payment, add your teammates by their CUBYC IDs.`,
      }),
    );

  const total = lines.reduce((sum, l) => sum + l.fee, 0);
  return { ok: errors.length === 0 && lines.length > 0, lines, total, errors, warnings, clashes: relevant };
}

/* -------------------------------------------------------------------------- */
/*  Teams                                                                     */
/* -------------------------------------------------------------------------- */

/** Where a team stands: 'incomplete' (below minimum), 'ready' or 'full'. */
export function teamStatus(event, memberCount) {
  const { min, max } = event.team;
  if (memberCount < min) return { status: 'incomplete', needed: min - memberCount, spots: max - memberCount };
  return { status: memberCount >= max ? 'full' : 'ready', needed: 0, spots: max - memberCount };
}

/**
 * Can this person join this team?
 *   event        catalog entry of the team's event
 *   memberCount  members already in the team, leader included
 *   isMember     already in this team?
 *   registered   slugs the person already holds (individual or in any team)
 */
export function checkTeamJoin({ event, memberCount, isMember = false, registered = [], catalog, slots = {} }) {
  const errors = [];
  if (!event?.team_event) errors.push({ code: 'not_team_event', message: 'This is not a team event.' });
  else {
    if (isMember) errors.push({ code: 'already_member', message: 'You are already in this team.' });
    else if (registered.includes(event.slug)) errors.push({ code: 'already_registered', message: `You are already registered for “${event.name}” in another entry.` });
    if (memberCount >= event.team.max) errors.push({ code: 'team_full', message: `This team is full (${event.team.max} members).` });
    const { clashes } = findClashes([event.slug, ...registered], slots);
    clashes
      .filter((c) => c.a === event.slug || c.b === event.slug)
      .forEach((c) => errors.push({ code: 'clash', slugs: [c.a, c.b], message: clashMessage(c, catalog) }));
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}

/* -------------------------------------------------------------------------- */
/*  Contingent rosters                                                        */
/* -------------------------------------------------------------------------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const norm = (s) => String(s ?? '').trim();
const key = (s) => norm(s).toLowerCase();

/**
 * Check a contingent's roster (one row per participant per event, as filled in
 * the Excel template) and price it.
 *   rows: [{ row, name, email, phone, event, team }]
 *     row    spreadsheet row number (for error messages)
 *     event  the event's name or slug
 *     team   team label within the contingent (needed for team events, e.g. "A")
 * Rules: 10–15 different events; every team within its event's size limits; a
 * person in at most one team per event; nobody in two events that clash.
 * Returns { ok, fee, events, errors, warnings }.
 */
export function checkContingent({ rows, catalog, slots = {} }) {
  const errors = [];
  const warnings = [];
  const byName = Object.fromEntries(Object.values(catalog).map((e) => [key(e.name), e]));
  const entries = {}; // slug → { event, people: Map(email → row), teams: Map(label → [rows]) }
  const personEvents = new Map(); // email → Set(slug)

  for (const r of rows) {
    const at = `Row ${r.row}`;
    const name = norm(r.name);
    const email = key(r.email);
    const ev = catalog[key(r.event)] ?? byName[key(r.event)];
    if (!ev) {
      errors.push({ code: 'unknown_event', row: r.row, message: `${at}: “${norm(r.event)}” is not an event in this fest.` });
      continue;
    }
    if (!name) errors.push({ code: 'missing_name', row: r.row, message: `${at}: the participant's name is missing.` });
    if (!EMAIL.test(email)) {
      errors.push({ code: 'bad_email', row: r.row, message: `${at}: “${norm(r.email)}” is not a valid email address.` });
      continue;
    }
    const entry = (entries[ev.slug] ??= { event: ev, people: new Map(), teams: new Map() });
    if (entry.people.has(email)) {
      errors.push({ code: 'duplicate_person', row: r.row, message: `${at}: ${name || email} is listed twice for “${ev.name}” (also row ${entry.people.get(email)}).` });
      continue;
    }
    entry.people.set(email, r.row);
    if (ev.team_event) {
      const label = norm(r.team);
      if (!label) {
        errors.push({ code: 'missing_team', row: r.row, message: `${at}: “${ev.name}” is a team event — write a team name (e.g. A or B) for ${name || email}.` });
        continue;
      }
      const team = entry.teams.get(key(label)) ?? [];
      team.push(r.row);
      entry.teams.set(key(label), team);
    }
    if (!personEvents.has(email)) personEvents.set(email, new Set());
    personEvents.get(email).add(ev.slug);
  }

  // Team sizes, per event and team.
  for (const { event, teams } of Object.values(entries)) {
    for (const [label, rowsInTeam] of teams) {
      const n = rowsInTeam.length;
      if (n < event.team.min || n > event.team.max) {
        errors.push({
          code: 'team_size',
          slug: event.slug,
          message: `“${event.name}”, team ${label.toUpperCase()}: ${n} member${n === 1 ? '' : 's'}, but this event needs ${event.team.min === event.team.max ? event.team.min : `${event.team.min}–${event.team.max}`} (rows ${rowsInTeam.join(', ')}).`,
        });
      }
    }
  }

  // 10–15 different events.
  const count = Object.keys(entries).length;
  if (count < CONTINGENT_EVENTS.min) {
    errors.push({ code: 'too_few_events', message: `A contingent must take part in at least ${CONTINGENT_EVENTS.min} different events — this roster has ${count}.` });
  } else if (count > CONTINGENT_EVENTS.max) {
    errors.push({ code: 'too_many_events', message: `A contingent can take part in at most ${CONTINGENT_EVENTS.max} different events — this roster has ${count}.` });
  }

  // Nobody in two events that clash.
  for (const [email, slugs] of personEvents) {
    const { clashes } = findClashes([...slugs], slots);
    clashes.forEach((c) => errors.push({ code: 'clash', email, slugs: [c.a, c.b], message: `${email}: ${clashMessage(c, catalog)}` }));
  }
  const { unscheduled } = findClashes(Object.keys(entries), slots);
  if (unscheduled.length) {
    warnings.push({ code: 'time_not_announced', slugs: unscheduled, message: `Times are not announced yet for ${unscheduled.length} of these events; clashes will be checked once the schedule is final.` });
  }

  const events = Object.values(entries).map(({ event, people, teams }) => ({
    slug: event.slug,
    name: event.name,
    participants: people.size,
    teams: event.team_event ? teams.size : 0,
  }));
  return { ok: errors.length === 0, fee: FEES.contingent, events, errors, warnings };
}
