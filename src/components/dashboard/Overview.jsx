import { EVENT } from '../../config/experience';
import Frame from '../ui/Frame';
import { ANNOUNCEMENTS } from '../../config/announcements';
import { PAYMENT } from '../../config/payment';
import { CATALOG } from '../../lib/registration/catalog';
import { whenKey, whenOf } from '../../lib/fest/when';
import { useFest } from '../../store/useFest';
import { BACKEND } from '../../store/useAuth';
import { Icon, PageHead, PayNotice, useCopy } from './ui';

/*
 * Overview: your CUBYC ID, four plain steps from sign-in to the ticket, your
 * next event and the latest announcement.
 */

const PAY = { none: 'Not paid yet', pending: 'Being checked', verified: 'Verified' };

export default function Overview({ user }) {
  const regs = useFest((s) => s.regs);
  const [copied, copy] = useCopy();
  const days = Math.max(0, Math.ceil((Date.parse(EVENT.start) - Date.now()) / 864e5));
  const pass = user.pass.status;
  const mine = [...regs].sort((a, b) => whenKey(a.slug).localeCompare(whenKey(b.slug)));
  const next = mine[0] && whenOf(mine[0].slug);
  const latest = ANNOUNCEMENTS.find((a) => a.pinned) ?? ANNOUNCEMENTS[0];
  const p = user.profile ?? {};
  const first = user.name.split(/\s+/)[0];

  const steps = [
    { done: Boolean(p.agree), title: 'Fill in your details', sub: p.agree ? 'Done' : 'Name, college, course and contact', href: '#/dashboard/register', cta: p.agree ? 'Edit' : 'Start' },
    BACKEND
      ? { done: false, title: 'Pick your events', sub: 'Opens soon', href: '#/dashboard/events', cta: null }
      : { done: regs.length > 0, title: 'Pick your events', sub: regs.length ? `${regs.length} event${regs.length === 1 ? '' : 's'} registered` : 'Individual or with a team', href: '#/dashboard/events', cta: regs.length ? 'Add more' : 'Browse' },
    { done: pass === 'verified', wait: pass === 'pending', title: `Pay the ₹${PAYMENT.amount} fest pass`, sub: BACKEND && pass === 'none' ? 'Opens soon' : PAY[pass], href: '#/dashboard/register', cta: BACKEND && pass === 'none' ? null : pass === 'none' ? 'Pay' : 'View' },
    { done: pass === 'verified', title: 'Get your festival ticket', sub: pass === 'verified' ? 'Ready — show it at the registration desk' : 'Issued once your payment is verified', href: '#/dashboard/register', cta: pass === 'verified' ? 'Open' : null },
  ];

  return (
    <>
      <PageHead title={`Welcome, ${first}`}>Everything for CUBYC — Fest’2027 in one place.</PageHead>
      <PayNotice user={user} />

      <section className="cd-panel cd-id" data-hero>
        <Frame />
        <div className="cd-id__main">
          <p className="cd-label">Your CUBYC ID</p>
          <p className="cd-id__code">{user.cubycId}</p>
          <p className="cd-id__meta">
            {user.name}
            {p.college ? ` · ${p.college}` : ''}
          </p>
          <div className="cd-actions">
            <button type="button" className="cd-btn cd-btn--sm" onClick={() => copy(user.cubycId)}>
              <Icon name="copy" className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy ID'}
            </button>
            <span className={`cd-chip cd-chip--${pass}`}>
              <i /> Payment · {PAY[pass]}
            </span>
          </div>
          <p className="cd-id__hint">Share this ID with your team leader, and write it in the remarks when you pay.</p>
        </div>
        <div className="cd-id__count">
          <b>{days}</b>
          <span>days to go</span>
          <small>{EVENT.dateLabel}</small>
        </div>
      </section>

      <section className="cd-panel" data-hero>
        <Frame />
        <h2 className="cd-panel__title">Your steps</h2>
        <ol className="cd-steps">
          {steps.map((s, i) => (
            <li key={s.title} className={`cd-step ${s.done ? 'is-done' : ''} ${s.wait ? 'is-wait' : ''}`}>
              <span className="cd-step__mark" aria-hidden="true">
                {s.done ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="cd-step__text">
                <b>{s.title}</b>
                <small>{s.sub}</small>
              </span>
              {s.cta && (
                <a href={s.href} className="cd-link">
                  {s.cta} <Icon name="arrow" className="h-3.5 w-3.5" />
                </a>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="cd-grid" data-hero>
        <section className="cd-panel">
          <Frame />
          <h2 className="cd-panel__title">Your next event</h2>
          {next ? (
            <div className="cd-next">
              <h3>{CATALOG[mine[0].slug].name}</h3>
              <p>
                <Icon name="events" className="h-3.5 w-3.5" /> {next.day} · {next.date}
              </p>
              <p>
                <Icon name="clock" className="h-3.5 w-3.5" /> {next.time}
              </p>
              <p>
                <Icon name="pin" className="h-3.5 w-3.5" /> {next.venue}
              </p>
              <a href="#/dashboard/my-events" className="cd-link">
                All my events <Icon name="arrow" className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <div className="cd-empty">
              {BACKEND ? (
                <>
                  <p>Event registration opens soon. Meanwhile, explore every event on the site.</p>
                  <a href="#/events" className="cd-btn">
                    See all events
                  </a>
                </>
              ) : (
                <>
                  <p>You haven’t picked any events yet.</p>
                  <a href="#/dashboard/events" className="cd-btn cd-btn--gold">
                    Browse events
                  </a>
                </>
              )}
            </div>
          )}
        </section>

        <section className="cd-panel">
          <Frame />
          <h2 className="cd-panel__title">Latest announcement</h2>
          <p className="cd-note__meta">
            <span className="cd-tag">{latest.tag}</span>
          </p>
          <h3 className="cd-note__title">{latest.title}</h3>
          <p className="cd-note__body">{latest.body}</p>
          <a href="#/dashboard/announcements" className="cd-link">
            All announcements <Icon name="arrow" className="h-3.5 w-3.5" />
          </a>
        </section>
      </div>
    </>
  );
}
