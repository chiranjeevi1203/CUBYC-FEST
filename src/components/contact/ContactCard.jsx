import { isTBA } from '../../config/team';

const initials = (name) =>
  name
    .replace(/^(dr|prof|fr|mr|ms|mrs)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
const formatPhone = (p) => (p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p);

const ICON = {
  phone: 'M6.6 3.5 8.3 7 6.8 8.4a9.6 9.6 0 0 0 4.8 4.8l1.4-1.5 3.5 1.7-.6 2.7c-.1.5-.6.9-1.1.9A13 13 0 0 1 2.9 4.1c0-.5.4-1 .9-1.1l2.8-.5Z',
  mail: 'M3 5h14v10H3Z M3 5l7 6 7-6',
};

/**
 * A person's contact as a simple glass card: a ringed medallion with initials,
 * name and role, and call / mail tags.
 * `compact` for the landing page strip.
 */
export default function ContactCard({ person, index = 0, compact = false, className = '' }) {
  const tba = isTBA(person);
  return (
    <li className={`ct-card ${compact ? 'ct-card--compact' : ''} ${tba ? 'is-tba' : ''} ${className}`} style={{ '--i': index % 6 }} data-rise>
      <span className="ct-card__medal" aria-hidden="true">
        {person.photo ? <img src={person.photo} alt="" loading="lazy" /> : tba ? <span className="ct-card__q">✦</span> : <b>{initials(person.name)}</b>}
      </span>

      <div className="ct-card__body">
        <p className="ct-card__role">{person.role}</p>
        <h3 className="ct-card__name">{tba ? 'To be announced' : person.name}</h3>
        <div className="ct-card__actions">
          {person.phone ? (
            <a href={`tel:+91${person.phone}`} className="ct-seal">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d={ICON.phone} />
              </svg>
              {formatPhone(person.phone)}
            </a>
          ) : null}
          {person.email ? (
            <a href={`mailto:${person.email}`} className="ct-seal">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d={ICON.mail} />
              </svg>
              {compact ? 'Email' : person.email}
            </a>
          ) : null}
          {!person.phone && !person.email && <span className="ct-seal is-soon">Contact shared soon</span>}
        </div>
      </div>
    </li>
  );
}
