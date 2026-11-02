import { useState } from 'react';
import Frame from '../ui/Frame';
import { CATALOG } from '../../lib/registration/catalog';
import { whenKey, whenOf } from '../../lib/fest/when';
import { checkMember, useFest } from '../../store/useFest';
import { initialsOf } from '../../store/useAuth';
import { Icon, PageHead, useCopy } from './ui';

/*
 * My Team: every team you lead or belong to — its event, when and where, the
 * team code to share, and the members. Leaders can add members by CUBYC ID;
 * anyone can join another team with a code.
 */

function JoinBox({ user }) {
  const joinTeam = useFest((s) => s.joinTeam);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const join = (e) => {
    e.preventDefault();
    const r = joinTeam(code, { cubycId: user.cubycId, name: user.name });
    if (!r.ok) return setMsg({ bad: true, text: r.error });
    setCode('');
    setMsg({ bad: false, text: `You joined the team for ${CATALOG[r.team.slug].name}.` });
    return undefined;
  };
  return (
    <section className="cd-panel" data-hero>
      <Frame />
      <h2 className="cd-panel__title">Have a team code?</h2>
      <p className="cd-panel__lead">Ask your team leader for the code, then enter it here to join.</p>
      <form className="cd-inline" onSubmit={join}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Team code, e.g. TM-8F2K" aria-label="Team code" />
        <button type="submit" className="cd-btn cd-btn--gold">
          Join team
        </button>
      </form>
      {msg && <p className={`cd-msg ${msg.bad ? 'is-bad' : ''}`}>{msg.text}</p>}
    </section>
  );
}

function AddMember({ team, user }) {
  const addMember = useFest((s) => s.addMember);
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState(null);
  const add = (e) => {
    e.preventDefault();
    const r = checkMember(draft, team.slug, { self: user.cubycId, taken: team.members.map((m) => m.cubycId) });
    if (!r.ok) return setMsg({ bad: true, text: r.error });
    addMember(team.id, r.person);
    setDraft('');
    setMsg({ bad: false, text: r.note ? `${r.person.name} added. ${r.note}` : `${r.person.name} added.` });
    return undefined;
  };
  return (
    <>
      <form className="cd-inline" onSubmit={add}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a member by CUBYC ID" aria-label="Member's CUBYC ID" />
        <button type="submit" className="cd-btn">
          <Icon name="plus" className="h-3.5 w-3.5" /> Add
        </button>
      </form>
      {msg && <p className={`cd-msg ${msg.bad ? 'is-bad' : ''}`}>{msg.text}</p>}
    </>
  );
}

export default function MyTeam({ user }) {
  const teams = useFest((s) => s.teams);
  const [copied, copy] = useCopy();
  const list = Object.values(teams).sort((a, b) => whenKey(a.slug).localeCompare(whenKey(b.slug)));

  return (
    <>
      <PageHead title="My Team">Your teams, their codes and members.</PageHead>
      <JoinBox user={user} />

      {list.length === 0 ? (
        <section className="cd-panel cd-empty" data-hero>
          <Frame />
          <p>You’re not in a team yet. To start one, pick a team event and choose “Team up”.</p>
          <a href="#/dashboard/events" className="cd-btn cd-btn--gold">
            Browse team events
          </a>
        </section>
      ) : (
        <ol className="cd-teams" data-hero>
          {list.map((t) => {
            const ev = CATALOG[t.slug];
            const w = whenOf(t.slug);
            const lead = t.leader === user.cubycId;
            const need = Math.max(0, ev.team.min - t.members.length);
            return (
              <li key={t.id} className="cd-panel cd-team">
                <Frame />
                <div className="cd-team__top">
                  <div className="min-w-0">
                    <p className="cd-label">{lead ? 'You’re the leader' : 'Member'}</p>
                    <h3>{ev.name}</h3>
                    <p className="cd-team__when">
                      <span>
                        <Icon name="events" className="h-3.5 w-3.5" /> {w ? `${w.day} · ${w.time}` : 'Time to be announced'}
                      </span>
                      {w && (
                        <span>
                          <Icon name="pin" className="h-3.5 w-3.5" /> {w.venue}
                        </span>
                      )}
                    </p>
                  </div>
                  <button type="button" className="cd-codechip" onClick={() => copy(t.code)} title="Copy team code">
                    <small>Team code</small>
                    <b>{t.code}</b>
                    <span>{copied === t.code ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className={`cd-team__count ${need ? 'is-short' : ''}`}>
                  {t.members.length} of {ev.team.max} members
                  {need ? ` · needs ${need} more to take part` : ''}
                </p>
                <ul className="cd-crew">
                  {t.members.map((m) => (
                    <li key={m.cubycId}>
                      <span className="cd-crew__avatar" aria-hidden="true">
                        {initialsOf(m.name)}
                      </span>
                      <span className="min-w-0">
                        <b>
                          {m.name}
                          {m.cubycId === user.cubycId ? ' (you)' : ''}
                        </b>
                        <small>
                          {m.cubycId}
                          {m.cubycId === t.leader ? ' · Leader' : ''}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
                {lead && t.members.length < ev.team.max && <AddMember team={t} user={user} />}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
