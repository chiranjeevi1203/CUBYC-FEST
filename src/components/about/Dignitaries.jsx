import Star from '../ui/Star';
import { Flourish, OrnateDivider } from './Ornaments';
import { BRAND } from '../../config/experience';
import { TEAM_SECTIONS, isTBA } from '../../config/team';
import { useViewMore, ViewMoreButton } from '../ui/ViewMore';

const pad = (n) => String(n).padStart(2, '0');
const initials = (name) =>
  name
    .replace(/^(dr|prof|fr|mr|ms|mrs)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
const formatPhone = (p) => (p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p);

/** Card tilt toward the pointer (a light 3D lean, like a card held in hand). */
const tilt = (e) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--rx', `${(((e.clientY - r.top) / r.height - 0.5) * -8).toFixed(2)}deg`);
  el.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(2)}deg`);
  el.style.setProperty('--gx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
};
const untilt = (e) => {
  e.currentTarget.style.setProperty('--rx', '0deg');
  e.currentTarget.style.setProperty('--ry', '0deg');
};

/** One group of the team; phones show the first four cards until "View more". */
function TeamSection({ s }) {
  const vm = useViewMore(s.people.length, 4);
  return (
    <section data-team={s.key} className={`dg-section ${s.featured ? 'dg-section--featured' : ''} ${s.plain ? 'dg-section--plain' : ''}`} aria-labelledby={`dg-${s.key}`}>
      <div data-rise className="dg-head">
        <p className="font-mono text-[0.58rem] tracking-[0.36em] text-gold-300/70 uppercase">{s.kicker}</p>
        <h3 id={`dg-${s.key}`} className="mt-2 font-display text-2xl font-bold tracking-[0.1em] uppercase sm:text-3xl">
          {s.title}
        </h3>
        <OrnateDivider className="mx-auto mt-3 w-52 text-gold-300/60" />
        <p className="mt-2 font-mono text-[0.55rem] tracking-[0.3em] text-white/40 uppercase">{pad(s.people.length)} members</p>
      </div>
      <ul className="dg-grid" data-cols={s.cols ?? 3}>
        {s.people.map((p, i) => (
          <PersonCard key={`${p.name}-${p.role}-${i}`} person={p} index={i} section={s} className={vm.cls(i)} />
        ))}
      </ul>
      <ViewMoreButton {...vm} />
    </section>
  );
}

/**
 * A person as an ornate game card: a gold double frame with filigree corners, a
 * numbered crest at the top, a medallion portrait (photo or initials) with side
 * studs, the name on a plate, the role beneath, contact for crew sections, and
 * rank stars at the foot.
 */
function PersonCard({ person, index, section, className = '' }) {
  const tba = isTBA(person);
  return (
    <li className={`gcard-wrap ${className}`} data-rise style={{ '--i': index % 6 }}>
      <article className={`gcard ${tba ? 'is-tba' : ''}`} onPointerMove={tilt} onPointerLeave={untilt}>
        <span className="gcard__glow" aria-hidden="true" />
        <span className="gcard__frame" aria-hidden="true" />
        <Flourish className="gcard__c gcard__c--tl" />
        <Flourish className="gcard__c gcard__c--tr" />
        <Flourish className="gcard__c gcard__c--bl" />
        <Flourish className="gcard__c gcard__c--br" />

        <div className="gcard__art">
          <span className="gcard__rays" aria-hidden="true" />
          <span className="gcard__stud gcard__stud--l" aria-hidden="true" />
          <span className="gcard__stud gcard__stud--r" aria-hidden="true" />
          <span className="gcard__medal">
            {person.photo ? (
              <img src={person.photo} alt="" loading="lazy" />
            ) : tba ? (
              <svg viewBox="0 0 20 20" className="gcard__silhouette" aria-hidden="true">
                <path d="M10 10a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M3.5 18c0-3.8 2.9-6.4 6.5-6.4s6.5 2.6 6.5 6.4" fill="currentColor" />
              </svg>
            ) : (
              <b>{initials(person.name)}</b>
            )}
          </span>
        </div>

        <div className="gcard__plate">
          <h4 className="gcard__name">{tba ? 'To be announced' : person.name}</h4>
        </div>
        <p className="gcard__role">{person.role}</p>

        {section.contact && (person.phone || person.email) && (
          <div className="gcard__contact">
            {person.phone && (
              <a href={`tel:+91${person.phone}`}>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M6.6 3.5 8.3 7 6.8 8.4a9.6 9.6 0 0 0 4.8 4.8l1.4-1.5 3.5 1.7-.6 2.7c-.1.5-.6.9-1.1.9A13 13 0 0 1 2.9 4.1c0-.5.4-1 .9-1.1l2.8-.5Z" />
                </svg>
                {formatPhone(person.phone)}
              </a>
            )}
            {person.email && (
              <a href={`mailto:${person.email}`}>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M3 5h14v10H3Z M3 5l7 6 7-6" />
                </svg>
                {person.email}
              </a>
            )}
          </div>
        )}
        {section.contact && !person.phone && !person.email && <p className="gcard__contact gcard__contact--soon">Contact shared soon</p>}

        <span className="gcard__ranks" aria-hidden="true">
          <i />
          <i />
          <b />
          <i />
          <i />
        </span>
        <span className="gcard__shine" aria-hidden="true" />
      </article>
    </li>
  );
}

/**
 * The people behind the fest, as ornate game cards — a section of the About page.
 * `scrollerRef` is the page's scroll container (for the section tabs).
 */
export default function Dignitaries({ scrollerRef }) {
  const jump = (key) => {
    const root = scrollerRef.current;
    const el = root?.querySelector(`[data-team="${key}"]`);
    if (el) root.scrollTo({ top: el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 96, behavior: 'smooth' });
  };

  return (
    <section id="dignitaries" className="mx-auto max-w-[92rem] scroll-mt-24 px-5 pb-16 pt-[clamp(4rem,9vw,6.5rem)] sm:px-8" aria-labelledby="dg-title">
      <header data-rise className="flex flex-col items-center text-center">
        <p className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
          <Star className="h-2 w-2 text-gold-400/70" />
          The crew behind {BRAND.fest}
          <Star className="h-2 w-2 text-gold-400/70" />
        </p>
        <h2 id="dg-title" className="title-cosmic mt-4 font-display text-[clamp(1.8rem,5.4vw,3.6rem)] font-bold leading-[1.05] tracking-[0.08em] uppercase">
          Meet the faces of the fest
        </h2>
        <span className="mt-5 block">
          <OrnateDivider className="w-64 text-gold-300/70" />
        </span>
        <nav className="dg-tabs mt-7" aria-label="Sections">
          {TEAM_SECTIONS.map((s) => (
            <button key={s.key} type="button" onClick={() => jump(s.key)} className="dg-tab">
              {s.title}
            </button>
          ))}
        </nav>
      </header>

      {TEAM_SECTIONS.map((s) => (
        <TeamSection key={s.key} s={s} />
      ))}
    </section>
  );
}
