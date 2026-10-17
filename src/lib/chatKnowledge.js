import { BRAND, EVENT } from '../config/experience';
import { DEPARTMENTS, DEPT_ORDER, EVENT_COUNT } from '../config/departments';
import { ALL_EVENTS } from '../config/allEvents';
import { SCHEDULE_DAYS } from '../config/schedule';
import { RULE_COUNT, RULE_SECTIONS } from '../config/rules';
import { WEB_LEAD } from '../config/team';

/**
 * Everything the chatbot knows about the fest, gathered from the site's own
 * config so answers never drift from what the pages show. Used by the in-browser
 * brain (chatBrain.js) and, as a text block, by the optional AI function (/api/chat).
 */
export const FEST = {
  name: BRAND.fest,
  title: BRAND.title,
  university: BRAND.universityFull,
  campus: BRAND.campus,
  subline: BRAND.subline,
  dateLabel: EVENT.dateLabel,
  days: EVENT.days,
  start: EVENT.start,
  end: EVENT.end,
  deptCount: DEPT_ORDER.length,
  eventCount: EVENT_COUNT,
};

/** Who built the website and this chatbot (from the Website Team on the About page). */
export const CREATOR = {
  name: WEB_LEAD.name,
  role: WEB_LEAD.role,
  email: WEB_LEAD.email,
  linkedin: WEB_LEAD.linkedin,
};

export { ALL_EVENTS, DEPARTMENTS, DEPT_ORDER, RULE_COUNT, RULE_SECTIONS, SCHEDULE_DAYS };

const plain = (s) => s.replace(/\*\*/g, '');

/** The whole fest as compact text (for the AI system prompt). Deterministic, so it caches. */
export function buildKnowledge() {
  const lines = [];
  lines.push(`FEST: ${FEST.title} — ${FEST.subline}, ${FEST.university}, ${FEST.campus}.`);
  lines.push(`DATES: ${FEST.dateLabel} (${FEST.days.join(', ')}). Starts ${FEST.start}, ends ${FEST.end} (IST).`);
  lines.push(`SCALE: ${FEST.deptCount} domains, ${FEST.eventCount} events.`);
  lines.push('REGISTRATION: Registrations open soon; the official form will be announced on the website. A valid college ID is mandatory.');
  lines.push('');
  lines.push('DOMAINS AND EVENTS (always say "domain", never "department"):');
  for (const key of DEPT_ORDER) {
    const d = DEPARTMENTS[key];
    lines.push(`\n## ${d.name}${d.short !== d.name ? ` (${d.short})` : ''}${d.faculty ? ` — ${d.facultyLabel ?? 'Faculty in-charge'}: ${d.faculty}` : ''}`);
    lines.push(d.intro);
    for (const e of d.events) {
      const people = [e.faculty && `faculty in-charge ${e.faculty}`, e.student && `student in-charge ${e.student.name} (+91 ${e.student.phone})`].filter(Boolean).join('; ');
      lines.push(`### ${e.name} — ${e.format}${people ? ` — ${people}` : ''}`);
      lines.push(e.summary);
      e.rules.forEach((r) => lines.push(`- ${r.replace(/\n/g, ' ')}`));
    }
  }
  lines.push('\nSCHEDULE (provisional — final timings to be announced):');
  for (const day of SCHEDULE_DAYS) {
    lines.push(`${day.label} (${day.date}) — ${day.title}: ${day.items.map((i) => `${i.time} ${i.title} @ ${i.venue}`).join('; ')}`);
  }
  lines.push('\nGENERAL RULES:');
  for (const s of RULE_SECTIONS) {
    lines.push(`${s.title}: ${s.rules.map(plain).join(' ')}`);
  }
  lines.push(
    `\nCREATOR: This website and its chatbot (CUBYC Comms) were designed and built by ${CREATOR.name}, ${CREATOR.role} of the ${FEST.name} website team. Email: ${CREATOR.email}. LinkedIn: ${CREATOR.linkedin}. The full website team is on the About page (#/about).`,
  );
  lines.push('\nWEBSITE PAGES: Home (#home), Events (#/events), each domain (#/dept/<key>), Gallery (#/gallery), Schedule (#/schedule), Rules (#/rules), About the campus, with the dignitaries and organising team (#/about), Contact: coordinators, student core and the campus map (#/contact), Sponsors (#/sponsors).');
  return lines.join('\n');
}
