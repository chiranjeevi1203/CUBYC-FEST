import { useEffect, useMemo, useState } from 'react';
import Frame from '../ui/Frame';
import { SCHEDULE_DAYS, clock } from '../../config/schedule';
import { CATALOG } from '../../lib/registration/catalog';
import { EVENT_SLOTS_LIST } from '../../lib/fest/when';
import { checkMember, clashesWith, useFest } from '../../store/useFest';
import { Icon, PageHead, PayNotice } from './ui';

/*
 * Events: the schedule, one day at a time, grouped by start time. Individual
 * events register in one tap; team events open the team builder (create a team
 * with your members' CUBYC IDs, or join one with a team code). Clashes are
 * caught for you and for each teammate.
 */

const sizeLabel = (t) => (t.min === t.max ? `Team of ${t.min}` : `Team of ${t.min}–${t.max}`);

function TeamBuilder({ slug, user, onClose }) {
  const ev = CATALOG[slug];
  const createTeam = useFest((s) => s.createTeam);
  const joinTeam = useFest((s) => s.joinTeam);
  const [tab, setTab] = useState('create');
  const [members, setMembers] = useState([]);
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState(null);
  const [code, setCode] = useState('');
  const [done, setDone] = useState(null);
  const total = members.length + 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const add = (e) => {
    e.preventDefault();
    if (total >= ev.team.max) return setMsg({ bad: true, text: `This event allows at most ${ev.team.max} members.` });
    const r = checkMember(draft, slug, { self: user.cubycId, taken: members.map((m) => m.cubycId) });
    if (!r.ok) return setMsg({ bad: true, text: r.error });
    setMembers([...members, r.person]);
    setDraft('');
    setMsg({ bad: false, text: r.note ? `${r.person.name} added. ${r.note}` : `${r.person.name} added.` });
    return undefined;
  };
  const create = () => {
    if (total < ev.team.min) return setMsg({ bad: true, text: `Add ${ev.team.min - total} more member${ev.team.min - total === 1 ? '' : 's'} — this event needs at least ${ev.team.min}.` });
    const r = createTeam(slug, { cubycId: user.cubycId, name: user.name }, members);
    if (!r.ok) return setMsg({ bad: true, text: r.error });
    setDone(r.team);
    return undefined;
  };
  const join = (e) => {
    e.preventDefault();
    const r = joinTeam(code, { cubycId: user.cubycId, name: user.name });
    if (!r.ok) return setMsg({ bad: true, text: r.error });
    setDone(r.team);
    return undefined;
  };

  return (
    <div className="cd-modal" role="dialog" aria-modal="true" aria-label={`Team registration for ${ev.name}`} onClick={onClose}>
      <div className="cd-modal__card" onClick={(e) => e.stopPropagation()}>
        <Frame />
        <button type="button" className="cd-modal__close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        <p className="cd-label">Team event · {sizeLabel(ev.team)}</p>
        <h2 className="cd-modal__title">{ev.name}</h2>

        {done ? (
          <div className="cd-team-done">
            <p className="cd-done">
              <Icon name="check" className="h-4 w-4" /> {done.leader === user.cubycId ? 'Team created' : 'You joined the team'}
            </p>
            <p className="cd-modal__lead">Share this team code so members can join from their own dashboard:</p>
            <p className="cd-code">{done.code}</p>
            <ul className="cd-roster">
              {done.members.map((m) => (
                <li key={m.cubycId}>
                  <b>{m.name}</b>
                  <small>
                    {m.cubycId}
                    {m.cubycId === done.leader ? ' · Leader' : ''}
                  </small>
                </li>
              ))}
            </ul>
            <div className="cd-actions">
              <a href="/dashboard/my-team" className="cd-btn" onClick={onClose}>
                See My Team
              </a>
              <button type="button" className="cd-btn cd-btn--gold" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="cd-tabs" role="tablist">
              {[
                ['create', 'Create a team'],
                ['join', 'Join with a code'],
              ].map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} className={`cd-tab ${tab === k ? 'is-on' : ''}`} onClick={() => (setTab(k), setMsg(null))}>
                  {l}
                </button>
              ))}
            </div>

            {tab === 'create' ? (
              <>
                <p className="cd-modal__lead">You’ll be the team leader. Add each member using their CUBYC ID — they can find it on their dashboard.</p>
                <ul className="cd-roster">
                  <li>
                    <b>{user.name} (you)</b>
                    <small>{user.cubycId} · Leader</small>
                  </li>
                  {members.map((m) => (
                    <li key={m.cubycId}>
                      <b>{m.name}</b>
                      <small>{m.cubycId}</small>
                      <button type="button" className="cd-roster__x" onClick={() => setMembers(members.filter((x) => x !== m))} aria-label={`Remove ${m.name}`}>
                        <Icon name="close" className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                  {Array.from({ length: Math.max(0, ev.team.min - total) }, (_, i) => (
                    <li key={`need-${i}`} className="is-empty">
                      <small>Member needed</small>
                    </li>
                  ))}
                </ul>
                {total < ev.team.max && (
                  <form className="cd-inline" onSubmit={add}>
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Member’s CUBYC ID, e.g. CB27-7K4Q" aria-label="Member's CUBYC ID" />
                    <button type="submit" className="cd-btn">
                      <Icon name="plus" className="h-3.5 w-3.5" /> Add
                    </button>
                  </form>
                )}
                {msg && <p className={`cd-msg ${msg.bad ? 'is-bad' : ''}`}>{msg.text}</p>}
                <div className="cd-modal__foot">
                  <span>
                    {total} of {ev.team.max} members
                  </span>
                  <button type="button" className="cd-btn cd-btn--gold" onClick={create} disabled={total < ev.team.min}>
                    Create team
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="cd-modal__lead">Got a team code from your leader? Enter it to join their team.</p>
                <form className="cd-inline" onSubmit={join}>
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Team code, e.g. TM-8F2K" aria-label="Team code" />
                  <button type="submit" className="cd-btn cd-btn--gold">
                    Join team
                  </button>
                </form>
                {msg && <p className={`cd-msg ${msg.bad ? 'is-bad' : ''}`}>{msg.text}</p>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Events({ user }) {
  const regs = useFest((s) => s.regs);
  const addIndividual = useFest((s) => s.addIndividual);
  const [day, setDay] = useState(1);
  const [kind, setKind] = useState('all');
  const [team, setTeam] = useState(null);
  const [toast, setToast] = useState(null);
  const held = regs.map((r) => r.slug);

  const slots = useMemo(() => {
    const list = EVENT_SLOTS_LIST.filter((s) => s.dayNo === day).filter((s) => kind === 'all' || (kind === 'team') === CATALOG[s.slug].team_event);
    const byStart = {};
    list.forEach((s) => (byStart[s.start] ??= []).push(s));
    return Object.entries(byStart).sort(([a], [b]) => a.localeCompare(b));
  }, [day, kind]);

  const flash = (text) => {
    setToast(text);
    window.clearTimeout(flash.t);
    flash.t = window.setTimeout(() => setToast(null), 3200);
  };
  const pick = (slug) => {
    const ev = CATALOG[slug];
    if (ev.team_event) return setTeam(slug);
    if (addIndividual(slug)) flash(`${ev.name} added to My Events.`);
    return undefined;
  };

  return (
    <>
      <PageHead title="Events">Pick a day, then register. Individual events take one tap; for team events, create a team or join one with a code.</PageHead>
      <PayNotice user={user} compact />

      <div className="cd-toolbar" data-hero>
        <div className="cd-tabs" role="group" aria-label="Day">
          {SCHEDULE_DAYS.map((d, i) => (
            <button key={d.key} type="button" className={`cd-tab cd-tab--day ${day === i + 1 ? 'is-on' : ''}`} onClick={() => setDay(i + 1)} aria-pressed={day === i + 1}>
              <b>{d.label}</b>
              <small>{d.date}</small>
            </button>
          ))}
        </div>
        <div className="cd-tabs" role="group" aria-label="Event type">
          {[
            ['all', 'All'],
            ['solo', 'Individual'],
            ['team', 'Team'],
          ].map(([k, l]) => (
            <button key={k} type="button" className={`cd-tab ${kind === k ? 'is-on' : ''}`} onClick={() => setKind(k)} aria-pressed={kind === k}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <ol className="cd-cal" data-hero>
        {slots.map(([start, list]) => (
          <li key={start} className="cd-cal__slot">
            <h2 className="cd-cal__time">
              <Icon name="clock" className="h-4 w-4" /> {clock(start)}
            </h2>
            <div className="cd-cal__events">
              {list.map((s) => {
                const ev = CATALOG[s.slug];
                const mine = held.includes(s.slug);
                const clash = !mine ? clashesWith(s.slug, held) : [];
                const blocked = clash.length > 0;
                return (
                  <article key={s.slug} className={`cd-ev ${mine ? 'is-mine' : ''} ${blocked ? 'is-blocked' : ''}`}>
                    <Frame size="sm" star={false} />
                    <div className="cd-ev__body">
                      <span className={`cd-ev__kind ${ev.team_event ? 'is-team' : ''}`}>
                        <Icon name={ev.team_event ? 'team' : 'solo'} className="h-3 w-3" /> {ev.team_event ? sizeLabel(ev.team) : 'Individual'}
                      </span>
                      <h3>{ev.name}</h3>
                      <p>
                        <span>
                          <Icon name="clock" className="h-3 w-3" /> {s.time}
                        </span>
                        <span>
                          <Icon name="pin" className="h-3 w-3" /> {s.venue}
                        </span>
                      </p>
                      {blocked && <p className="cd-ev__clash">Same time as {CATALOG[clash[0]].name}, which you’ve registered for.</p>}
                    </div>
                    <div className="cd-ev__side">
                      {mine ? (
                        <span className="cd-ev__state">
                          <Icon name="check" className="h-3.5 w-3.5" /> Registered
                        </span>
                      ) : (
                        <button type="button" className={`cd-btn cd-btn--sm ${blocked ? '' : 'cd-btn--gold'}`} disabled={blocked} onClick={() => pick(s.slug)}>
                          {ev.team_event ? 'Team up' : 'Register'}
                        </button>
                      )}
                      <a href={`/dept/${ev.dept}/events/${ev.slug}`} className="cd-link cd-link--quiet">
                        Details
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {toast && (
        <p className="cd-toast" role="status">
          <Icon name="check" className="h-4 w-4" /> {toast}
        </p>
      )}
      {team && <TeamBuilder slug={team} user={user} onClose={() => setTeam(null)} />}
    </>
  );
}
