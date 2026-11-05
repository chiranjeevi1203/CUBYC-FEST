import { useEffect, useMemo, useRef, useState } from 'react';
import Frame from '../ui/Frame';
import { SCHEDULE_DAYS, clock } from '../../config/schedule';
import { CATALOG } from '../../lib/registration/catalog';
import { EVENT_SLOTS_LIST, whenKey, whenOf } from '../../lib/fest/when';
import { EVENT_TABLE, clashOf } from '../../lib/fest/eventTable';
import { cleanTeamName, isTeamCode, normaliseCode } from '../../lib/fest/teamCode';
import { initialsOf } from '../../store/useAuth';
import { useRegs } from '../../store/useRegs';
import { Icon, PageHead, useCopy } from './ui';

/*
 * Event registration on the live site (Firebase): Events, My Events and My
 * Team. Individual events: register in one tap, withdraw while registration is
 * open. Team events: the leader creates a team (name unique in that event) and
 * shares its code with a ready-made invite; members join with the code. Events
 * at the same time are blocked for you — here, and again by the database.
 */

const sizeLabel = (t) => (t.min === t.max ? `Team of ${t.min}` : `Team of ${t.min}–${t.max}`);
const nameOf = (slug) => CATALOG[slug]?.name ?? slug;
const whenText = (slug) => {
  const w = whenOf(slug);
  return w ? `${w.day}, ${w.time}` : 'time to be announced';
};
export const joinLink = (code) => `${window.location.origin}/dashboard/join/${code}`;
const me = (user) => ({ uid: user.uid, cubycId: user.cubycId, name: user.profile?.name || user.name });

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
}

function Modal({ label, onClose, children, narrow = false }) {
  useEscape(onClose);
  return (
    <div className="cd-modal" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className={`cd-modal__card ${narrow ? 'cd-confirm' : ''}`} onClick={(e) => e.stopPropagation()}>
        <Frame />
        <button type="button" className="cd-modal__close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);
  const t = useRef(0);
  const flash = (text) => {
    setToast(text);
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setToast(null), 3400);
  };
  useEffect(() => () => window.clearTimeout(t.current), []);
  const node = toast && (
    <p className="cd-toast" role="status">
      <Icon name="check" className="h-4 w-4" /> {toast}
    </p>
  );
  return [node, flash];
}

/* ---------- notices ---------- */

/** Registration closed / details missing / loading, plus the fest-pass reminder. */
export function RegNotices({ user, compact = false }) {
  const { loaded, open, error } = useRegs();
  return (
    <>
      {error && (
        <div className="cd-notice" role="alert" data-hero>
          <Icon name="alert" className="cd-notice__icon" />
          <p>{error}</p>
        </div>
      )}
      {!user.profileComplete ? (
        <div className="cd-notice" role="note" data-hero>
          <Icon name="alert" className="cd-notice__icon" />
          <p>
            <b>Complete your details first.</b> You can register for events once your details are saved.
          </p>
          <a href="/dashboard/register" className="cd-btn cd-btn--gold cd-btn--sm">
            Your details
          </a>
        </div>
      ) : loaded && !open ? (
        <div className="cd-notice is-pending" role="note" data-hero>
          <Icon name="clock" className="cd-notice__icon" />
          <p>
            <b>Event registration is closed right now.</b> The CUBYC team opens it — watch Announcements. Your registrations so far are saved.
          </p>
        </div>
      ) : null}
      <div className={`cd-notice is-pending ${compact ? 'is-compact' : ''}`} role="note" data-hero>
        <Icon name="ticket" className="cd-notice__icon" />
        <p>
          <b>Your fest pass makes it count.</b> Registering saves your spot; to take part you need a valid fest pass — ₹400 for Christites, ₹500 for everyone else. Payment opens soon.
        </p>
      </div>
    </>
  );
}

/* ---------- the invite ---------- */

function inviteMessage(team, origin = joinLink(team.id)) {
  const ev = EVENT_TABLE[team.slug];
  const w = whenOf(team.slug);
  const left = Math.max(0, ev.max - team.memberUids.length);
  return [
    `🚀 CUBYC FEST'27 — squad call!`,
    ``,
    `I've created team “${team.name}” for ${nameOf(team.slug)} and I want you in it.`,
    w ? `🗓 ${w.day}, ${w.date} · ${w.time}\n📍 ${w.venue}` : null,
    ``,
    `🔑 Team code: ${team.id}`,
    `👉 Join in one tap: ${origin}`,
    `(or sign in → My Team → Join a team → enter the code)`,
    ``,
    left ? `${left} spot${left === 1 ? '' : 's'} left — let's take the trophy home! 🏆` : `Let's take the trophy home! 🏆`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/** The team code and a ready-made invite to copy or share (WhatsApp or any app). */
function InviteCard({ team }) {
  const [copied, copy] = useCopy();
  const msg = inviteMessage(team);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = async () => {
    try {
      await navigator.share({ title: `Join ${team.name} — CUBYC FEST'27`, text: msg });
    } catch {
      /* closed */
    }
  };
  return (
    <div className="cd-invite">
      <button type="button" className="cd-codechip cd-invite__code" onClick={() => copy(team.id)} title="Copy team code">
        <small>Team code</small>
        <b>{team.id}</b>
        <span>{copied === team.id ? 'Copied' : 'Tap to copy'}</span>
      </button>
      <p className="cd-label">Your invite</p>
      <pre className="cd-invite__msg">{msg}</pre>
      <div className="cd-actions">
        <button type="button" className="cd-btn cd-btn--gold cd-btn--sm" onClick={() => copy(msg)}>
          <Icon name={copied === msg ? 'check' : 'copy'} className="h-3.5 w-3.5" /> {copied === msg ? 'Copied' : 'Copy invite'}
        </button>
        <a className="cd-btn cd-btn--sm" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        {canShare && (
          <button type="button" className="cd-btn cd-btn--sm" onClick={share}>
            <Icon name="link" className="h-3.5 w-3.5" /> Share…
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- create / join ---------- */

function CreateTeam({ slug, user, onDone }) {
  const createTeam = useRegs((s) => s.createTeam);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const ev = EVENT_TABLE[slug];
  const submit = async (e) => {
    e.preventDefault();
    if (!cleanTeamName(name)) return setMsg('Team names are 2–40 letters, numbers, spaces or . _ & \' - and start with a letter or number.');
    setBusy(true);
    setMsg(null);
    const r = await createTeam(me(user), slug, name);
    setBusy(false);
    if (!r.ok) return setMsg(r.error);
    onDone(r.value);
    return undefined;
  };
  return (
    <form onSubmit={submit}>
      <p className="cd-modal__lead">
        You’ll lead the team. Give it a name (unique in this event), then invite {ev.max - 1 === 1 ? 'your teammate' : `up to ${ev.max - 1} teammates`} with the team code.
      </p>
      <div className="cd-inline">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Team name, e.g. Code Crusaders" aria-label="Team name" autoComplete="off" />
        <button type="submit" className="cd-btn cd-btn--gold" disabled={busy}>
          {busy ? 'Creating…' : 'Create team'}
        </button>
      </div>
      {msg && <p className="cd-msg is-bad">{msg}</p>}
    </form>
  );
}

/** Enter a code → see the team → confirm (or be told why you can't). */
function JoinTeam({ user, initialCode = '', onDone }) {
  const { findTeam, joinTeam, regs, open } = useRegs();
  const [code, setCode] = useState(initialCode);
  const [team, setTeam] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const look = async (raw) => {
    const c = normaliseCode(raw);
    if (!isTeamCode(c)) return setMsg('Team codes look like TM-7K4QXM — check it with your team leader.');
    setBusy(true);
    setMsg(null);
    setTeam(null);
    const r = await findTeam(c);
    setBusy(false);
    if (!r.ok) return setMsg(r.error);
    setTeam(r.value);
    return undefined;
  };
  useEffect(() => {
    if (initialCode) look(initialCode);
  }, [initialCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = async () => {
    setBusy(true);
    setMsg(null);
    const r = await joinTeam(me(user), team.id);
    setBusy(false);
    if (!r.ok) return setMsg(r.error);
    onDone(r.value);
    return undefined;
  };

  let block = null;
  if (team) {
    const ev = EVENT_TABLE[team.slug];
    const clash = clashOf(team.slug, regs);
    if (team.memberUids.includes(user.uid)) block = 'You’re already in this team.';
    else if (regs.some((r) => r.slug === team.slug)) block = `You’re already registered for ${nameOf(team.slug)}. One team per event.`;
    else if (clash)
      block = `You’re already registered for ${nameOf(clash)} at the same time (${whenText(clash)}). This clashes with ${nameOf(team.slug)}, so you can’t join. Please verify with your team and confirm — withdraw from ${nameOf(clash)} first if you’d rather play here.`;
    else if (team.status !== 'active') block = 'This team is no longer taking members.';
    else if (team.memberUids.length >= ev.max) block = `This team is full (${ev.max} members).`;
    else if (!open) block = 'Registration is closed right now.';
    else if (!user.profileComplete) block = 'Complete your details first, then join.';
  }
  const w = team ? whenOf(team.slug) : null;

  return (
    <div>
      <form
        className="cd-inline"
        onSubmit={(e) => {
          e.preventDefault();
          look(code);
        }}
      >
        <input value={code} onChange={(e) => (setCode(e.target.value), setTeam(null))} maxLength={12} placeholder="Team code, e.g. TM-7K4QXM" aria-label="Team code" autoComplete="off" spellCheck={false} />
        <button type="submit" className="cd-btn" disabled={busy}>
          {busy && !team ? 'Finding…' : 'Find team'}
        </button>
      </form>
      {team && (
        <div className="cd-joincard">
          <p className="cd-label">Team invite</p>
          <h3>{team.name}</h3>
          <p className="cd-team__when">
            <span>
              <Icon name="events" className="h-3.5 w-3.5" /> {nameOf(team.slug)}
            </span>
            {w && (
              <>
                <span>
                  <Icon name="clock" className="h-3.5 w-3.5" /> {w.day} · {w.time}
                </span>
                <span>
                  <Icon name="pin" className="h-3.5 w-3.5" /> {w.venue}
                </span>
              </>
            )}
          </p>
          <p className="cd-joincard__lead">
            Led by <b>{team.leaderName}</b> · {team.memberUids.length} of {EVENT_TABLE[team.slug].max} members
          </p>
          {block ? (
            <p className="cd-msg is-bad" role="alert">
              {block}
            </p>
          ) : (
            <div className="cd-actions">
              <button type="button" className="cd-btn cd-btn--gold" onClick={confirm} disabled={busy}>
                {busy ? 'Joining…' : 'Confirm & join'}
              </button>
            </div>
          )}
        </div>
      )}
      {msg && (
        <p className="cd-msg is-bad" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}

function TeamModal({ slug, user, onClose }) {
  const ev = EVENT_TABLE[slug];
  const [tab, setTab] = useState('create');
  const [done, setDone] = useState(null);
  return (
    <Modal label={`Team registration for ${nameOf(slug)}`} onClose={onClose}>
      <p className="cd-label">Team event · {sizeLabel(ev)}</p>
      <h2 className="cd-modal__title">{nameOf(slug)}</h2>
      {done ? (
        <>
          <p className="cd-done">
            <Icon name="check" className="h-4 w-4" /> {done.leaderUid === user.uid ? `Team “${done.name}” is ready — now bring in your crew!` : `You joined “${done.name}”.`}
          </p>
          {done.leaderUid === user.uid ? <InviteCard team={done} /> : null}
          <div className="cd-actions">
            <a href="/dashboard/my-team" className="cd-btn" onClick={onClose}>
              See My Team
            </a>
            <button type="button" className="cd-btn cd-btn--gold" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="cd-tabs" role="tablist">
            {[
              ['create', 'Create a team'],
              ['join', 'Join with a code'],
            ].map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={`cd-tab ${tab === k ? 'is-on' : ''}`} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>
          {tab === 'create' ? <CreateTeam slug={slug} user={user} onDone={setDone} /> : <JoinTeam user={user} onDone={setDone} />}
        </>
      )}
    </Modal>
  );
}

/* ---------- Events ---------- */

export function LiveEvents({ user }) {
  const { regs, open, loaded, register } = useRegs();
  const [day, setDay] = useState(1);
  const [kind, setKind] = useState('all');
  const [team, setTeam] = useState(null);
  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const [toast, flash] = useToast();
  const can = loaded && open && user.profileComplete;

  const slots = useMemo(() => {
    const list = EVENT_SLOTS_LIST.filter((s) => s.dayNo === day && EVENT_TABLE[s.slug]).filter((s) => kind === 'all' || (kind === 'team') === CATALOG[s.slug].team_event);
    const byStart = {};
    list.forEach((s) => (byStart[s.start] ??= []).push(s));
    return Object.entries(byStart).sort(([a], [b]) => a.localeCompare(b));
  }, [day, kind]);

  const doRegister = async (slug) => {
    setAsk(null);
    setBusy(slug);
    setErr(null);
    const r = await register(me(user), slug);
    setBusy(null);
    if (!r.ok) return setErr({ slug, text: r.error });
    flash(`${nameOf(slug)} added to My Events.`);
    return undefined;
  };

  return (
    <>
      <PageHead title="Events">Pick a day, then register. Individual events take one tap; for team events, create a team and invite your crew, or join one with a code.</PageHead>
      <RegNotices user={user} compact />

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
                const t = EVENT_TABLE[s.slug];
                const mine = regs.find((r) => r.slug === s.slug);
                const clash = !mine ? clashOf(s.slug, regs) : null;
                return (
                  <article key={s.slug} className={`cd-ev ${mine ? 'is-mine' : ''} ${clash ? 'is-blocked' : ''}`}>
                    <Frame size="sm" star={false} />
                    <div className="cd-ev__body">
                      <span className={`cd-ev__kind ${t.team ? 'is-team' : ''}`}>
                        <Icon name={t.team ? 'team' : 'solo'} className="h-3 w-3" /> {t.team ? sizeLabel(t) : 'Individual'}
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
                      {clash && <p className="cd-ev__clash">Clashes with {nameOf(clash)}, which you’ve registered for.</p>}
                      {err?.slug === s.slug && (
                        <p className="cd-ev__clash" role="alert">
                          {err.text}
                        </p>
                      )}
                      {ask === s.slug && (
                        <p className="cd-ev__ask">
                          <span className="cd-ask">Register for {ev.name}?</span>
                          <button type="button" className="cd-btn cd-btn--sm cd-btn--gold" onClick={() => doRegister(s.slug)}>
                            Yes, register
                          </button>
                          <button type="button" className="cd-btn cd-btn--sm" onClick={() => setAsk(null)}>
                            Cancel
                          </button>
                        </p>
                      )}
                    </div>
                    <div className="cd-ev__side">
                      {mine ? (
                        <a href={mine.kind === 'team' ? '/dashboard/my-team' : '/dashboard/my-events'} className="cd-ev__state">
                          <Icon name="check" className="h-3.5 w-3.5" /> {mine.kind === 'team' ? 'In a team' : 'Registered'}
                        </a>
                      ) : (
                        <button
                          type="button"
                          className={`cd-btn cd-btn--sm ${clash || !can ? '' : 'cd-btn--gold'}`}
                          disabled={Boolean(clash) || !can || busy === s.slug}
                          onClick={() => (t.team ? setTeam(s.slug) : (setErr(null), setAsk(s.slug)))}
                        >
                          {busy === s.slug ? 'Saving…' : t.team ? 'Team up' : 'Register'}
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
      {toast}
      {team && <TeamModal slug={team} user={user} onClose={() => setTeam(null)} />}
    </>
  );
}

/* ---------- My Events ---------- */

export function LiveMyEvents({ user }) {
  const { regs, teams, open, withdraw, loaded } = useRegs();
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const [toast, flash] = useToast();
  const mine = [...regs].filter((r) => CATALOG[r.slug]).sort((a, b) => whenKey(a.slug).localeCompare(whenKey(b.slug)));

  const doWithdraw = async (slug) => {
    setBusy(slug);
    setErr(null);
    const r = await withdraw(me(user), slug);
    setBusy(null);
    setConfirm(null);
    if (!r.ok) return setErr({ slug, text: r.error });
    flash(`You withdrew from ${nameOf(slug)}.`);
    return undefined;
  };

  return (
    <>
      <PageHead title="My Events">Where to be and when, in the order you’ll attend.</PageHead>
      <RegNotices user={user} compact />
      {!loaded ? (
        <p className="cd-gate__loading">Loading your events…</p>
      ) : mine.length === 0 ? (
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
            const lead = t?.leaderUid === user.uid;
            return (
              <li key={r.slug} className="cd-panel cd-mine__card">
                <Frame />
                <div className="cd-mine__top">
                  <div className="min-w-0">
                    <p className="cd-label">{r.kind === 'team' ? `Team event · ${lead ? 'You’re the leader' : 'Member'}` : 'Individual event'}</p>
                    <h3>{ev.name}</h3>
                  </div>
                  <span className={`cd-chip ${user.pass?.status === 'verified' ? 'cd-chip--verified' : 'cd-chip--none'}`}>
                    <i /> {user.pass?.status === 'verified' ? 'Confirmed' : 'Needs fest pass'}
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
                    <span>
                      <b>{t.name}</b> · {t.members.map((m) => (m.uid === user.uid ? 'You' : m.name)).join(', ')}
                    </span>
                  </p>
                )}
                {err?.slug === r.slug && (
                  <p className="cd-msg is-bad" role="alert">
                    {err.text}
                  </p>
                )}
                <div className="cd-actions">
                  <a href={`/dept/${ev.dept}/events/${ev.slug}`} className="cd-btn cd-btn--sm">
                    Event details
                  </a>
                  {r.kind === 'team' ? (
                    <a href="/dashboard/my-team" className="cd-btn cd-btn--sm">
                      Team
                    </a>
                  ) : !open ? null : confirm === r.slug ? (
                    <>
                      <span className="cd-ask">Withdraw from this event?</span>
                      <button type="button" className="cd-btn cd-btn--sm cd-btn--danger" onClick={() => doWithdraw(r.slug)} disabled={busy === r.slug}>
                        {busy === r.slug ? 'Withdrawing…' : 'Yes, withdraw'}
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
      {toast}
    </>
  );
}

/* ---------- My Team ---------- */

function ConfirmDismantle({ team, onCancel, onDone }) {
  const { dismantle } = useRegs();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const go = async () => {
    setBusy(true);
    const r = await dismantle({ uid: team.leaderUid }, team.id);
    setBusy(false);
    if (!r.ok) return setMsg(r.error);
    onDone();
    return undefined;
  };
  return (
    <Modal label="Dismantle team" onClose={busy ? () => {} : onCancel} narrow>
      <Icon name="alert" className="cd-confirm__icon" />
      <h2 className="cd-modal__title">Dismantle “{team.name}”?</h2>
      <p className="cd-modal__lead">
        This removes the team and the registration of every member ({team.members.length}) for <b>{nameOf(team.slug)}</b>, and frees the name. It can’t be undone.
      </p>
      {msg && (
        <p className="cd-msg is-bad" role="alert">
          {msg}
        </p>
      )}
      <div className="cd-actions">
        <button type="button" className="cd-btn" onClick={onCancel} disabled={busy}>
          Keep the team
        </button>
        <button type="button" className="cd-btn cd-btn--danger" onClick={go} disabled={busy}>
          {busy ? 'Dismantling…' : 'Yes, dismantle'}
        </button>
      </div>
    </Modal>
  );
}

export function LiveMyTeam({ user, joinCode = '' }) {
  const { teams, open, loaded } = useRegs();
  const [copied, copy] = useCopy();
  const [invite, setInvite] = useState(null);
  const [wipe, setWipe] = useState(null);
  const [toast, flash] = useToast();
  const list = Object.values(teams).sort((a, b) => whenKey(a.slug).localeCompare(whenKey(b.slug)));

  return (
    <>
      <PageHead title="My Team">Your teams, their codes and members.</PageHead>
      <RegNotices user={user} compact />

      <section className="cd-panel" data-hero>
        <Frame />
        <h2 className="cd-panel__title">Join a team</h2>
        <p className="cd-panel__lead">Got a team code from your leader? Enter it to see the team, then confirm.</p>
        <JoinTeam key={joinCode} user={user} initialCode={joinCode} onDone={(t) => flash(`Welcome to “${t.name}”!`)} />
      </section>

      {!loaded ? (
        <p className="cd-gate__loading">Loading your teams…</p>
      ) : list.length === 0 ? (
        <section className="cd-panel cd-empty" data-hero>
          <Frame />
          <p>You’re not in a team yet. To start one, pick a team event and choose “Team up”.</p>
          <a href="/dashboard/events" className="cd-btn cd-btn--gold">
            Browse team events
          </a>
        </section>
      ) : (
        <ol className="cd-teams" data-hero>
          {list.map((t) => {
            const ev = EVENT_TABLE[t.slug] ?? { min: 1, max: 1 };
            const w = whenOf(t.slug);
            const lead = t.leaderUid === user.uid;
            const need = Math.max(0, ev.min - t.members.length);
            return (
              <li key={t.id} className="cd-panel cd-team">
                <Frame />
                <div className="cd-team__top">
                  <div className="min-w-0">
                    <p className="cd-label">
                      {nameOf(t.slug)} · {lead ? 'You’re the leader' : 'Member'}
                    </p>
                    <h3>{t.name}</h3>
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
                  <button type="button" className="cd-codechip" onClick={() => copy(t.id)} title="Copy team code">
                    <small>Team code</small>
                    <b>{t.id}</b>
                    <span>{copied === t.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className={`cd-team__count ${need ? 'is-short' : ''}`}>
                  {t.status === 'dismantling' ? 'Being dismantled…' : `${t.members.length} of ${ev.max} members${need ? ` · needs ${need} more to take part` : t.members.length >= ev.max ? ' · full' : ''}`}
                </p>
                <ul className="cd-crew">
                  {t.members.map((m) => (
                    <li key={m.uid}>
                      <span className="cd-crew__avatar" aria-hidden="true">
                        {initialsOf(m.name)}
                      </span>
                      <span className="min-w-0">
                        <b>
                          {m.name}
                          {m.uid === user.uid ? ' (you)' : ''}
                        </b>
                        <small>
                          {m.cubycId}
                          {m.uid === t.leaderUid ? ' · Leader' : ''}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
                {lead ? (
                  <div className="cd-actions">
                    {t.status === 'active' && t.members.length < ev.max && (
                      <button type="button" className="cd-btn cd-btn--gold cd-btn--sm" onClick={() => setInvite(t)}>
                        <Icon name="plus" className="h-3.5 w-3.5" /> Invite teammates
                      </button>
                    )}
                    {open && (
                      <button type="button" className="cd-link cd-link--quiet" onClick={() => setWipe(t)}>
                        {t.status === 'dismantling' ? 'Finish dismantling' : 'Dismantle team'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="cd-team__note">Team registrations can’t be withdrawn. If this team was a mistake, ask your leader to dismantle it.</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {invite && (
        <Modal label={`Invite to ${invite.name}`} onClose={() => setInvite(null)}>
          <p className="cd-label">{nameOf(invite.slug)}</p>
          <h2 className="cd-modal__title">Invite your crew to “{invite.name}”</h2>
          <p className="cd-modal__lead">Send this to your teammates on WhatsApp or anywhere — they tap the link (or enter the code) and confirm.</p>
          <InviteCard team={teams[invite.id] ?? invite} />
        </Modal>
      )}
      {wipe && (
        <ConfirmDismantle
          team={teams[wipe.id] ?? wipe}
          onCancel={() => setWipe(null)}
          onDone={() => {
            setWipe(null);
            flash('Team dismantled. Everyone is free to register again.');
          }}
        />
      )}
      {toast}
    </>
  );
}
