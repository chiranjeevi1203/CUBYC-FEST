import { ALL_EVENTS, CREATOR, DEPARTMENTS, DEPT_ORDER, FEST, RULE_COUNT, RULE_SECTIONS, SCHEDULE_DAYS } from './chatKnowledge';

/**
 * The chatbot's built-in brain: answers fest questions instantly, offline and
 * free. It understands everyday phrasing and small typos, remembers the event or
 * department you were talking about for follow-ups ("who's the coordinator?"),
 * and returns { text, links, chips, confident }. When it isn't confident the UI
 * can hand the question to the AI function (if one is deployed).
 *
 * text: lines; **bold**; lines starting with "• " render as bullets.
 * links: [{ label, href }] or [{ label, dept, event }] (opens a department's event page).
 */

/* -------------------------------------------------------------------------- */
/*  Text helpers                                                              */
/* -------------------------------------------------------------------------- */

const STOP = new Set(
  'a an the of and or to in on at for is are be do does did can could will would should i me my we you your it its this that what whats which who whom how when where why tell about please pls plz show give list any some there here with from by as into than then also just get know want need much many more'.split(
    ' ',
  ),
);

export function norm(s) {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9₹+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Does a token match a word, allowing small typos on longer words? */
function near(tok, word) {
  if (tok === word) return true;
  if (word.length >= 6 && tok.length >= 5 && (tok.startsWith(word) || word.startsWith(tok)) && Math.abs(tok.length - word.length) <= 2) return true;
  if (word.length >= 6) return lev(tok, word) <= (word.length >= 8 ? 2 : 1);
  return false;
}

/** Looser match for names (events, departments): one typo allowed from 5 letters. */
function nearName(tok, word) {
  return near(tok, word) || (word.length >= 5 && tok.length >= 4 && lev(tok, word) <= 1);
}

/** Any of the phrases/words present? Phrases match as substrings, single words fuzzily. */
function has(q, list) {
  return list.some((p) => (p.includes(' ') ? q.text.includes(p) : q.tokens.some((t) => near(t, p))));
}

const pad = (n) => String(n).padStart(2, '0');
const formatPhone = (p) => (p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p);
const plainRule = (r) => r.replace(/\*\*/g, '');

/* -------------------------------------------------------------------------- */
/*  Indexes                                                                   */
/* -------------------------------------------------------------------------- */

const EVENT_ALIASES = {
  'bulls-and-bears-mock-stock': ['mock stock', 'stock market', 'share market', 'stocks', 'trading', 'bulls'],
  'plot-twist-pop-culture-quiz': ['pop culture', 'plot twist', 'quiz'],
  'case-404': ['case 404', 'detective', 'mystery', 'investigation', 'crime', 'murder', 'clue'],
  'crack-the-psyche': ['crack the psyche', 'charades', 'dumb charades', 'pictionary', 'psyche'],
  'cybertronian-wars-gaming': ['cybertronian', 'gaming', 'esports', 'e sports', 'valorant', 'games'],
  'transwarp-protocol-capture-the-flag': ['transwarp', 'capture the flag', 'ctf', 'hacking', 'cybersecurity', 'cyber security'],
  'prime-prompt-ai-prompt-wars': ['prime prompt', 'prompt wars', 'prompt engineering', 'prompting', 'prompt', 'chatgpt'],
  monomatics: ['monomatics', 'monopoly'],
  'auction-sudoku': ['auction sudoku', 'sudoku'],
  'best-manager-sustainaquest': ['best manager', 'sustainaquest', 'sustainability'],
  'percepta-hr': ['percepta', 'human resources', 'hr', 'shark tank'],
  '6-hour-filmithon': ['filmithon', 'filmathon', 'short film', 'film making', 'filmmaking', 'movie making'],
  imposter: ['imposter', 'impostor', 'among us'],
  'literature-court-room': ['court room', 'courtroom', 'moot court', 'literature court', 'trial'],
  'convince-the-time-keeper': ['time keeper', 'timekeeper', 'literary character'],
  'brain-to-brand-pitching-event': ['brain to brand', 'pitching', 'pitch', 'startup', 'business plan'],
  'meme-battle': ['meme', 'memes'],
  'escape-room': ['escape room', 'escape'],
  'capture-the-assets': ['capture the assets', 'field game', 'outdoor game'],
  'air-crash': ['air crash', 'parachute', 'plane crash'],
  'clash-of-councils': ['clash of councils', 'council', 'councils'],
  'battle-of-bands-western': ['western band', 'rock band', 'western music'],
  'battle-of-bands-indian': ['indian band', 'indian music', 'fusion band'],
  'indian-group-dance-non-theme': ['group dance'],
  'street-play': ['street play', 'nukkad', 'nukkad natak'],
  mime: ['mime'],
  'indian-film-and-folk-dance-solo': ['solo dance', 'folk dance', 'film dance'],
};
// Words that point at more than one event (resolved as a short list).
const SHARED_ALIASES = {
  band: ['battle-of-bands-western', 'battle-of-bands-indian'],
  bands: ['battle-of-bands-western', 'battle-of-bands-indian'],
  dance: ['indian-group-dance-non-theme', 'indian-film-and-folk-dance-solo'],
  quiz: ['plot-twist-pop-culture-quiz', 'percepta-hr'],
  debate: ['air-crash', 'literature-court-room'],
};
const GENERIC = new Set(['event', 'events', 'battle', 'indian', 'the', 'room', 'wars', 'protocol', 'non', 'theme', 'hour', 'solo', 'film', 'and', 'game']);

const EVENTS = ALL_EVENTS.map((e) => ({
  ...e,
  aliases: EVENT_ALIASES[e.slug] ?? [],
  words: norm(e.name)
    .split(' ')
    .filter((w) => w.length > 2 && !STOP.has(w) && !GENERIC.has(w)),
}));
const bySlug = Object.fromEntries(EVENTS.map((e) => [e.slug, e]));

const DEPT_ALIASES = {
  mercury: ['economics', 'eco', 'econ', 'mercury'],
  venus: ['psychology', 'psych', 'psy', 'venus'],
  earth: ['computer science', 'cs', 'bca', 'mca', 'computer', 'computers', 'earth'],
  moon: ['mathematics', 'maths', 'math', 'moon'],
  mars: ['commerce', 'bcom', 'mars'],
  station: ['cultural events', 'cultural', 'culturals', 'swo', 'space station', 'station'],
  jupiter: ['media studies', 'media', 'journalism', 'jupiter'],
  saturn: ['cultural studies and languages', 'cultural studies', 'languages', 'english', 'english and cultural studies', 'literature', 'saturn'],
  uranus: ['management', 'sbm', 'bba', 'uranus'],
  neptune: ['dps', 'professional studies', 'neptune'],
};

/* -------------------------------------------------------------------------- */
/*  Matching                                                                  */
/* -------------------------------------------------------------------------- */

/** A multi-word name typed with small typos ("mock stok", "computer sceince"). */
function fuzzyPhrase(q, phrase) {
  const words = phrase.split(' ');
  for (let i = 0; i + words.length <= q.tokens.length; i++) {
    if (words.every((w, k) => nearName(q.tokens[i + k], w))) return true;
  }
  return false;
}

function findEvents(q) {
  const scores = EVENTS.map((e) => {
    let s = 0;
    for (const a of e.aliases) {
      if (a.includes(' ') ? q.text.includes(a) || fuzzyPhrase(q, a) : q.tokens.some((t) => nearName(t, a))) s += a.includes(' ') ? 4 : 3;
    }
    for (const w of e.words) if (q.tokens.some((t) => nearName(t, w))) s += 1.6;
    return { e, s };
  })
    .filter((x) => x.s >= 2.5)
    .sort((a, b) => b.s - a.s);
  if (scores.length) {
    const top = scores[0].s;
    return scores.filter((x) => x.s >= top - 0.5).map((x) => x.e);
  }
  for (const [word, slugs] of Object.entries(SHARED_ALIASES)) {
    if (q.tokens.some((t) => near(t, word))) return slugs.map((s) => bySlug[s]);
  }
  return [];
}

function findDept(q) {
  let best = null;
  let bestScore = 0;
  for (const key of DEPT_ORDER) {
    for (const a of DEPT_ALIASES[key]) {
      const hit = a.includes(' ') ? q.text.includes(a) || fuzzyPhrase(q, a) : q.tokens.some((t) => (a.length <= 3 ? t === a : nearName(t, a)));
      if (hit && a.length > bestScore) {
        best = key;
        bestScore = a.length;
      }
    }
  }
  return best;
}

/* -------------------------------------------------------------------------- */
/*  Answer builders                                                           */
/* -------------------------------------------------------------------------- */

const eventLink = (e) => ({ label: `Open ${e.name}`, dept: e.dept, event: e.slug });
const deptLink = (key) => ({ label: `Visit ${DEPARTMENTS[key].name}`, dept: key });

function eventOverview(e) {
  const people = [];
  if (e.faculty) people.push(`Faculty in-charge: **${e.faculty}**`);
  if (e.student) people.push(`Student in-charge: **${e.student.name}** (${formatPhone(e.student.phone)})`);
  return {
    text: [
      `**${e.name}** — ${e.deptName} · ${e.world}`,
      e.summary,
      `Format: **${e.format}**`,
      ...people,
      `It has ${e.rules.length} rules — ask me "rules" for the details, or open the event page.`,
    ].join('\n'),
    links: [eventLink(e), { label: 'All events', href: '#/events' }],
    chips: [`Rules of ${short(e)}`, `Who is the contact for ${short(e)}?`, `Other ${e.deptName} events`],
  };
}
const short = (e) => e.name.replace(/\s*\(.*\)\s*/, '');

function eventRules(e) {
  const rules = e.rules.slice(0, 7).map((r) => `• ${r.replace(/\n- /g, '; ').replace(/\n/g, ' ')}`);
  return {
    text: [`**${e.name} — format & rules**`, ...rules, e.rules.length > 7 ? `…and ${e.rules.length - 7} more on the event page.` : ''].filter(Boolean).join('\n'),
    links: [eventLink(e)],
    chips: [`Team size for ${short(e)}`, `Contact for ${short(e)}`],
  };
}

function eventPeople(e) {
  if (!e.faculty && !e.student) {
    const d = DEPARTMENTS[e.dept];
    return {
      text: `No individual coordinator is listed for **${e.name}** yet.${d.faculty ? ` The ${d.name} ${d.facultyLabel ?? 'faculty in-charge'} is **${d.faculty}**.` : ''} Contacts will be updated on the event page.`,
      links: [eventLink(e)],
    };
  }
  return {
    text: [
      `**${e.name}** contacts:`,
      e.faculty ? `• Faculty in-charge: **${e.faculty}**` : '',
      e.student ? `• Student in-charge: **${e.student.name}** — ${formatPhone(e.student.phone)}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    links: [eventLink(e)],
  };
}

function eventTeam(e) {
  return { text: `**${e.name}** — ${e.format}.`, links: [eventLink(e)], chips: [`Rules of ${short(e)}`] };
}

function eventWhen(e) {
  const hits = [];
  for (const day of SCHEDULE_DAYS) {
    for (const it of day.items) {
      if (norm(it.title).includes(norm(short(e)).split(' ')[0])) hits.push(`• ${day.label} (${day.date}) · ${it.time} — ${it.title} @ ${it.venue}`);
    }
  }
  return {
    text: hits.length
      ? [`**${e.name}** on the provisional schedule:`, ...hits, 'Final timings will be confirmed closer to the fest.'].join('\n')
      : `The exact slot for **${e.name}** isn't published yet. The fest runs **${FEST.dateLabel}**; detailed timings will be announced on the Schedule page.`,
    links: [{ label: 'Open schedule', href: '#/schedule' }, eventLink(e)],
  };
}

function deptEvents(key) {
  const d = DEPARTMENTS[key];
  if (d.hub) return listDepartments();
  const list = ALL_EVENTS.filter((e) => e.dept === key);
  return {
    text: [
      `**${d.name}** (${list[0]?.world ?? ''}) — ${d.tagline}`,
      d.faculty ? `${d.facultyLabel ?? 'Faculty in-charge'}: **${d.faculty}**` : '',
      `${list.length} event${list.length === 1 ? '' : 's'}:`,
      ...list.map((e) => `• **${e.name}** — ${e.format}`),
    ]
      .filter(Boolean)
      .join('\n'),
    links: [deptLink(key), ...list.slice(0, 3).map(eventLink)],
    chips: list.slice(0, 3).map((e) => `Tell me about ${short(e)}`),
  };
}

function listDepartments() {
  return {
    text: [
      `**${FEST.deptCount} domains, ${FEST.eventCount} events:**`,
      ...DEPT_ORDER.filter((k) => !DEPARTMENTS[k].hub).map((k) => `• **${DEPARTMENTS[k].name}** — ${DEPARTMENTS[k].events.length} event${DEPARTMENTS[k].events.length === 1 ? '' : 's'}`),
    ].join('\n'),
    links: [{ label: 'Browse all events', href: '#/events' }],
    chips: ['Computer Science events', 'Cultural events', 'Individual events'],
  };
}

function listEvents(filter, label) {
  const list = ALL_EVENTS.filter(filter);
  return {
    text: [`**${label} (${list.length}):**`, ...list.map((e) => `• ${e.name} — ${e.deptName} · ${e.format}`)].join('\n'),
    links: [{ label: 'Open the Events page', href: '#/events' }],
    chips: ['Team events', 'Individual events', 'How do I register?'],
  };
}

function scheduleAnswer(q) {
  const wantDay = q.text.match(/\bday\s*(1|2|one|two|01|02)\b/) || q.text.match(/\b(first|second)\s+day\b/);
  const which = wantDay ? (/(2|two|02|second)/.test(wantDay[0]) ? 1 : 0) : null;
  const days = which === null ? SCHEDULE_DAYS : [SCHEDULE_DAYS[which]];
  const lines = [];
  for (const d of days) {
    lines.push(`**${d.label} · ${d.date} — ${d.title}**`);
    d.items.forEach((i) => lines.push(`• ${i.time} — ${i.title} (${i.venue})`));
  }
  lines.push('_Provisional — final timings will be confirmed._');
  return { text: lines.join('\n'), links: [{ label: 'Open the Schedule', href: '#/schedule' }], chips: which === 0 ? ['Day 2 schedule'] : ['Day 1 schedule'] };
}

function rulesAnswer(q) {
  const all = RULE_SECTIONS.flatMap((s) => s.rules.map((r) => ({ s: s.title, r: plainRule(r) })));
  const keys = q.tokens.filter((t) => t.length > 3 && !STOP.has(t) && !['rule', 'rules', 'regulation', 'regulations', 'general', 'allowed', 'allow', 'mandatory', 'compulsory', 'need', 'needed', 'required'].includes(t));
  const hits = keys.length ? all.filter((x) => keys.some((k) => norm(x.r).split(' ').some((w) => near(w, k)))) : [];
  if (hits.length && hits.length < all.length) {
    return { text: ['Here’s what the rules say:', ...hits.slice(0, 5).map((x) => `• ${x.r}`)].join('\n'), links: [{ label: 'All rules', href: '#/rules' }] };
  }
  return {
    text: [`**General rules (${RULE_COUNT}) — highlights:**`, ...all.slice(0, 6).map((x) => `• ${x.r}`), 'Each event also has its own rules on its page.'].join('\n'),
    links: [{ label: 'Open the Rules', href: '#/rules' }],
    chips: ['Is ID card mandatory?', 'Reporting time', 'Are phones allowed?'],
  };
}

function countdown() {
  const ms = new Date(FEST.start).getTime() - Date.now();
  if (ms <= 0) return new Date(FEST.end).getTime() > Date.now() ? 'The fest is **live right now**!' : 'This edition has wrapped up — thank you for orbiting with us!';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return `**${d} days and ${h} hours** to go — the fest begins on ${FEST.days[0]}.`;
}

/* -------------------------------------------------------------------------- */
/*  The brain                                                                 */
/* -------------------------------------------------------------------------- */

const SUB = {
  rules: ['rule', 'rules', 'format', 'rounds', 'round', 'judging', 'criteria', 'guidelines', 'how does it work', 'how it works', 'procedure', 'regulations'],
  people: ['contact', 'coordinator', 'coordinators', 'incharge', 'in charge', 'phone', 'number', 'call', 'whatsapp', 'faculty', 'student', 'organiser', 'organizer', 'head', 'reach out', 'handles', 'handling', 'manages', 'conducts', 'conducting', 'who is running', 'who runs'],
  team: ['team size', 'team', 'members', 'member', 'individual', 'solo', 'how many people', 'participants', 'group'],
  when: ['when', 'time', 'timing', 'timings', 'slot', 'schedule', 'what time'],
};

export const SUGGESTIONS = ['When is the fest?', 'List all events', 'How do I register?', 'Tell me about the CTF', 'Day 1 schedule', 'General rules'];

export function createBrain() {
  const ctx = { event: null, dept: null };

  function reply(raw) {
    const text = norm(raw);
    const q = { raw, text, tokens: text.split(' ').filter(Boolean) };
    const ok = (r) => ({ links: [], chips: [], ...r, confident: true });
    if (!text) return ok({ text: 'Go ahead — ask me anything about the fest.' });

    // Small talk.
    if (q.tokens.length <= 4 && has(q, ['hi', 'hello', 'hey', 'hii', 'hiii', 'heyy', 'yo', 'hola', 'namaste', 'good morning', 'good afternoon', 'good evening', 'sup'])) {
      return ok({ text: `Hey there! I'm **CUBYC Comms**, your guide to ${FEST.title}. Ask me about events, domains, rules, the schedule or registration.`, chips: SUGGESTIONS.slice(0, 4) });
    }
    // Who built the site / the bot — checked before "thanks" so "who made this cool site?" lands here.
    const firstName = norm(CREATOR.name).split(' ')[0];
    if (
      has(q, ['who built', 'who made', 'who created', 'who developed', 'who designed', 'who coded', 'who programmed', 'built you', 'made you', 'created you', 'built this', 'made this', 'creator', 'developer', 'developers', 'website team', 'web team', firstName]) &&
      !has(q, ['event', 'events'])
    ) {
      return ok({
        text: `I was built by **${CREATOR.name}**, ${CREATOR.role} of the ${FEST.name} website team. ${firstName[0].toUpperCase() + firstName.slice(1)} designed and developed this whole website — the galaxy intro, the solar system of domains, the pages — and me, **CUBYC Comms**.\n• Email: ${CREATOR.email}\n• LinkedIn: linkedin.com/in/${CREATOR.linkedin.replace(/\/+$/, '').split('/').pop()}\nThe rest of the website team is on the About page.`,
        links: [
          { label: 'LinkedIn', href: CREATOR.linkedin },
          { label: 'Meet the team', href: '#/about' },
        ],
        chips: ['When is the fest?', 'List all events'],
      });
    }
    if (has(q, ['thanks', 'thank you', 'thank', 'thx', 'ty', 'tysm', 'cool', 'great', 'awesome', 'nice'])) return ok({ text: 'Anytime! Anything else you’d like to know?', chips: SUGGESTIONS.slice(1, 4) });
    if (has(q, ['bye', 'goodbye', 'see you', 'cya', 'later'])) return ok({ text: 'Clear skies! See you in orbit. 🚀' });
    if (has(q, ['who are you', 'what are you', 'your name', 'what can you do', 'help', 'how to use', 'what do you know'])) {
      return ok({
        text: `I'm **CUBYC Comms**, the fest's guide. I can tell you about:\n• all ${FEST.eventCount} events — rules, team size, contacts\n• the ${FEST.deptCount} domains\n• dates, venue and registration\n• the schedule and general rules\nI was built by **${CREATOR.name}** — ask me about my creator!`,
        chips: SUGGESTIONS,
      });
    }

    // A specific event?
    const events = findEvents(q);
    if (events.length > 1) {
      return ok({
        text: `I found a few matches — which one do you mean?\n${events.map((e) => `• **${e.name}** (${e.deptName})`).join('\n')}`,
        chips: events.map((e) => `Tell me about ${short(e)}`),
        links: events.slice(0, 3).map(eventLink),
      });
    }
    const dept = findDept(q);
    // Follow-ups about the last event ("rules?", "who's the contact?", "when is it?") —
    // but never when the question is clearly about the fest as a whole.
    const festLevel = has(q, ['fest', 'cubyc', 'festival', 'where', 'venue', 'register', 'registration', 'schedule', 'day 1', 'day 2', 'all events', 'general rules']);
    const followUp = has(q, SUB.rules) || has(q, SUB.people) || has(q, SUB.team) || (has(q, SUB.when) && has(q, ['it', 'this', 'that']));
    const e = events[0] ?? (!dept && ctx.event && followUp && !festLevel ? ctx.event : null);
    if (e) {
      ctx.event = e;
      ctx.dept = e.dept;
      if (has(q, SUB.people)) return ok(eventPeople(e));
      if (has(q, SUB.rules)) return ok(eventRules(e));
      if (has(q, SUB.when)) return ok(eventWhen(e));
      if (has(q, SUB.team)) return ok(eventTeam(e));
      return ok(eventOverview(e));
    }

    // Filtered event lists.
    if (has(q, ['individual events', 'solo events', 'individual', 'solo']) && has(q, ['event', 'events', 'which', 'list', 'compete'])) {
      return ok(listEvents((x) => x.solo, 'Individual events'));
    }
    if (has(q, ['team events', 'group events']) || (has(q, ['team', 'group']) && has(q, ['events', 'event']) && !dept)) return ok(listEvents((x) => !x.solo, 'Team events'));

    // A department?
    if (dept) {
      ctx.dept = dept;
      ctx.event = null;
      const d = DEPARTMENTS[dept];
      if (has(q, SUB.people) && d.faculty) return ok({ text: `**${d.name}** — ${d.facultyLabel ?? 'Faculty in-charge'}: **${d.faculty}**. Each event also lists its own coordinators.`, links: [deptLink(dept)] });
      return ok(deptEvents(dept));
    }

    // Practical questions whose details aren't published yet — answer honestly.
    const LOGISTICS = [
      [['food', 'canteen', 'lunch', 'snacks', 'eat', 'drinks', 'water'], 'Food & refreshments', 'Food stalls and the campus food court will be open on both days; lunch breaks are on the schedule.'],
      [['parking', 'park', 'vehicle', 'bike', 'car'], 'Parking', 'Parking arrangements for visitors will be shared with registration details.'],
      [['accommodation', 'stay', 'hostel', 'room', 'lodging'], 'Accommodation', 'Accommodation details for outstation participants will be announced with registration.'],
      [['certificate', 'certificates', 'certification'], 'Certificates', 'Participation and winner certificate details will be announced closer to the fest.'],
      [['prize', 'prizes', 'cash', 'reward', 'rewards', 'winner', 'winners', 'trophy'], 'Prizes', 'Prizes and recognition for winners will be announced with each event; some events also have individual awards (e.g. Battle of Bands).'],
      [['other college', 'other colleges', 'outside', 'outsiders', 'inter college', 'intercollege', 'eligible', 'eligibility', 'who can participate'], 'Eligibility', 'Eligibility details will be published with the registration form. A valid college ID is mandatory for entry.'],
      [['dress code', 'wear', 'attire', 'uniform'], 'Dress code', 'No general dress code is announced. Some performance events ask for modest costumes — check each event’s rules.'],
      [['wifi', 'wi fi', 'internet', 'charging'], 'Connectivity', 'Events that need laptops or internet say so in their rules (e.g. the CTF allows internet for research).'],
    ];
    for (const [words, title, line] of LOGISTICS) {
      if (has(q, words)) return ok({ text: `**${title}:** ${line}
Follow this website for updates.`, chips: ['How do I register?', 'General rules'] });
    }
    // Fest-level topics.
    if (has(q, ['how many days left', 'days left', 'countdown', 'how long', 'days to go', 'how many days'])) return ok({ text: countdown() });
    if (has(q, ['register', 'registration', 'registrations', 'sign up', 'signup', 'enroll', 'enrol', 'apply', 'participate', 'join', 'fee', 'fees', 'cost', 'price', 'ticket', 'tickets', 'pass', 'payment', 'charge', 'free'])) {
      return ok({
        text: `Registrations for **${FEST.name}** open soon — the official form will be announced on this website.\n• Registration is confirmed only after the official form is completed\n• Carry a **valid college ID** on both days\n• Fees, if any, will be published with the form\nMeanwhile, pick your events on the Events page.`,
        links: [{ label: 'Browse events', href: '#/events' }, { label: 'Rules', href: '#/rules' }],
        chips: ['List all events', 'Team events'],
      });
    }
    if (has(q, ['schedule', 'timetable', 'time table', 'timing', 'timings', 'itinerary', 'programme', 'program', 'agenda', 'day 1', 'day 2', 'day one', 'day two', 'first day', 'second day'])) return ok(scheduleAnswer(q));
    if (has(q, ['when', 'date', 'dates', 'which day', 'what day', 'month', 'start', 'begin', 'starts', 'happening', 'held'])) {
      return ok({ text: `**${FEST.title}** runs on **${FEST.dateLabel}**:\n• ${FEST.days[0]}\n• ${FEST.days[1]}\n${countdown()}`, links: [{ label: 'Schedule', href: '#/schedule' }] });
    }
    if (has(q, ['where', 'venue', 'location', 'address', 'campus', 'reach', 'directions', 'map', 'place', 'located'])) {
      return ok({
        text: `The fest is at **${FEST.university}, ${FEST.campus}** (Yeshwanthpur, Bengaluru). Event venues across campus will be shared with the final schedule.`,
        links: [{ label: 'Open in Maps', href: 'https://www.google.com/maps/search/?api=1&query=Christ+University+Yeshwanthpur+Campus' }],
      });
    }
    if (has(q, ['rule', 'rules', 'regulation', 'regulations', 'id card', 'phone', 'phones', 'mobile', 'late', 'reporting', 'disqualified', 'disqualification', 'conduct', 'judges', 'allowed', 'dress code', 'plagiarism'])) return ok(rulesAnswer(q));
    if (has(q, ['events', 'event', 'competitions', 'competition', 'activities', 'what can i participate'])) return ok(listEvents(() => true, 'All events'));
    if (has(q, ['domain', 'domains', 'department', 'departments', 'dept', 'depts', 'planets', 'worlds'])) return ok(listDepartments());
    if (has(q, ['gallery', 'photos', 'pictures', 'pics', 'images', 'memories'])) return ok({ text: 'The Gallery has moments from our campus — drawn into a black hole!', links: [{ label: 'Open the Gallery', href: '#/gallery' }] });
    if (has(q, ['cubyc', 'about the fest', 'what is this', 'what is the fest', 'about fest', 'flagship', 'christ university', 'christ'])) {
      return ok({
        text: `**${FEST.title}** is ${FEST.subline.toLowerCase().replace(/^our /, 'the ')} of ${FEST.university}, ${FEST.campus} — ${FEST.deptCount} domains and ${FEST.eventCount} events across two days, ${FEST.dateLabel}.`,
        chips: ['List all events', 'When is the fest?', 'How do I register?'],
      });
    }
    if (has(q, ['contact', 'organisers', 'organizers', 'helpline', 'email', 'reach you', 'queries', 'support'])) {
      return ok({
        text: 'Each event lists its faculty and student in-charge — just ask, e.g. "contact for the meme battle". Domain faculty in-charges are on each domain page.',
        links: [{ label: 'Browse events', href: '#/events' }],
      });
    }

    // Not sure — the UI may ask the AI, else this is shown.
    return {
      text: "I'm not sure about that one yet. I know the fest's events, domains, rules, schedule and registration — try one of these:",
      links: [{ label: 'Browse events', href: '#/events' }],
      chips: SUGGESTIONS.slice(0, 4),
      confident: false,
    };
  }

  return { reply, context: ctx };
}
