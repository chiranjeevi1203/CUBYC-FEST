import { useState } from 'react';
import Frame from '../ui/Frame';
import { CATALOG } from '../../lib/registration/catalog';
import { whenKey, whenOf } from '../../lib/fest/when';
import { useFest } from '../../store/useFest';
import { Icon, PageHead, PayNotice } from './ui';

/*
 * My Events: everything you're registered for, in the order you'll attend —
 * when and where to be, and for team events who's with you.
 */

export default function MyEvents({ user }) {
  const regs = useFest((s) => s.regs);
  const teams = useFest((s) => s.teams);
  const withdraw = useFest((s) => s.withdraw);
  const [confirm, setConfirm] = useState(null);
  const mine = [...regs].sort((a, b) => whenKey(a.slug).localeCompare(whenKey(b.slug)));
  const valid = user.pass.status === 'verified';

  return (
    <>
      <PageHead title="My Events">Where to be and when, in the order you’ll attend.</PageHead>
      <PayNotice user={user} compact />

      {mine.length === 0 ? (
        <section className="cd-panel cd-empty" data-hero>
          <Frame />
          <p>You haven’t registered for any events yet.</p>
          <a href="/dashboard/events" className="cd-btn cd-btn--gold">
            Browse events
          </a>
        </section>
      ) : (
        <ol className="cd-mine" data-hero>
          {mine.map((r) => {
            const ev = CATALOG[r.slug];
            const w = whenOf(r.slug);
            const t = r.teamId ? teams[r.teamId] : null;
            const lead = t?.leader === user.cubycId;
            return (
              <li key={r.slug} className="cd-panel cd-mine__card">
                <Frame />
                <div className="cd-mine__top">
                  <div className="min-w-0">
                    <p className="cd-label">{t ? `Team event · ${lead ? 'You’re the leader' : 'Member'}` : 'Individual event'}</p>
                    <h3>{ev.name}</h3>
                  </div>
                  <span className={`cd-chip ${valid ? 'cd-chip--verified' : 'cd-chip--none'}`}>
                    <i /> {valid ? 'Confirmed' : 'Awaiting payment'}
                  </span>
                </div>
                <dl className="cd-facts">
                  <div>
                    <dt>
                      <Icon name="events" className="h-3.5 w-3.5" /> Day
                    </dt>
                    <dd>{w ? `${w.day} · ${w.date}` : 'To be announced'}</dd>
                  </div>
                  <div>
                    <dt>
                      <Icon name="clock" className="h-3.5 w-3.5" /> Time
                    </dt>
                    <dd>{w ? w.time : 'To be announced'}</dd>
                  </div>
                  <div>
                    <dt>
                      <Icon name="pin" className="h-3.5 w-3.5" /> Venue
                    </dt>
                    <dd>{w ? w.venue : 'To be announced'}</dd>
                  </div>
                </dl>
                {t && (
                  <p className="cd-mine__team">
                    <Icon name="team" className="h-3.5 w-3.5" />
                    <span>{t.members.map((m) => (m.cubycId === user.cubycId ? 'You' : m.name)).join(', ')}</span>
                  </p>
                )}
                <div className="cd-actions">
                  <a href={`/dept/${ev.dept}/events/${ev.slug}`} className="cd-btn cd-btn--sm">
                    Event details
                  </a>
                  {t && (
                    <a href="/dashboard/my-team" className="cd-btn cd-btn--sm">
                      Team
                    </a>
                  )}
                  {confirm === r.slug ? (
                    <>
                      <span className="cd-ask">{t && lead ? 'Withdraw and close the team?' : 'Withdraw from this event?'}</span>
                      <button type="button" className="cd-btn cd-btn--sm cd-btn--danger" onClick={() => (withdraw(r.slug), setConfirm(null))}>
                        Yes, withdraw
                      </button>
                      <button type="button" className="cd-btn cd-btn--sm" onClick={() => setConfirm(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button type="button" className="cd-link cd-link--quiet" onClick={() => setConfirm(r.slug)}>
                      Withdraw
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
