import { useEffect, useMemo, useState } from 'react';
import Frame from '../components/ui/Frame';
import { Icon, PageHead } from '../components/dashboard/ui';
import { DEPARTMENTS, DEPT_ORDER } from '../config/departments';
import { downloadCsv, personRow } from '../lib/admin/stats';
import * as api from '../lib/firebase/admin';
import { BarList, DayColumns, Split } from './charts';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const rupees = (n) => `₹${fmt(n)}`;
const when = (t) => {
  const d = t?.toDate ? t.toDate() : null;
  return d ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
};
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const PASS = { none: 'Not paid', pending: 'Pending', verified: 'Verified', rejected: 'Rejected' };

/* ------------------------------------------------------------------ pieces */

function Panel({ title, aside, children, className = '' }) {
  return (
    <section className={`cd-panel adm-panel ${className}`}>
      <Frame />
      {(title || aside) && (
        <div className="adm-panel__head">
          {title && <h2 className="cd-panel__title">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

function Kpi({ icon, label, value, sub, tone }) {
  return (
    <div className={`cd-panel adm-kpi ${tone ? `is-${tone}` : ''}`}>
      <Frame size="sm" star={false} />
      <p className="adm-kpi__label">
        <Icon name={icon} className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="adm-kpi__value">{value}</p>
      {sub && <p className="adm-kpi__sub">{sub}</p>}
    </div>
  );
}

function Modal({ label, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div className="cd-modal" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className={`cd-modal__card adm-modal ${wide ? 'is-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <Frame />
        <button type="button" className="cd-modal__close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}

/** "Are you sure?" — for anything that changes or removes data. */
function Confirm({ title, body, label = 'Confirm', danger = false, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal label={title} onClose={busy ? () => {} : onCancel}>
      <div className="cd-confirm adm-confirm">
        <Icon name={danger ? 'alert' : 'check'} className="cd-confirm__icon" />
        <h2 className="cd-modal__title">{title}</h2>
        <p className="cd-modal__lead">{body}</p>
        <div className="cd-actions">
          <button type="button" className="cd-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`cd-btn ${danger ? 'cd-btn--danger' : 'cd-btn--gold'}`}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
          >
            {busy ? 'Working…' : label}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Search({ value, onChange, placeholder }) {
  return (
    <label className="adm-search">
      <Icon name="search" className="h-4 w-4" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

function Chips({ value, onChange, options }) {
  return (
    <div className="cd-tabs adm-chips" role="group">
      {options.map(([k, l]) => (
        <button key={k} type="button" className={`cd-tab ${value === k ? 'is-on' : ''}`} onClick={() => onChange(k)} aria-pressed={value === k}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** A table that scrolls sideways on small screens. cols: [{ key, label, render?, num?, sortable? }] */
function Table({ cols, rows, onRow, empty = 'Nothing to show.', initialSort, max = 100 }) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [shown, setShown] = useState(max);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const c = cols.find((x) => x.key === sort.key);
    const val = c?.sortValue ?? ((r) => r[sort.key]);
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const d = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''));
      return sort.dir === 'asc' ? d : -d;
    });
  }, [rows, sort, cols]);
  if (!rows.length) return <p className="adm-empty">{empty}</p>;
  return (
    <>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} className={c.num ? 'is-num' : ''} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortable === false ? (
                    c.label
                  ) : (
                    <button type="button" onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 'desc' ? 'asc' : 'desc' }))}>
                      {c.label}
                      {sort?.key === c.key && <span aria-hidden="true">{sort.dir === 'asc' ? ' ↑' : ' ↓'}</span>}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, shown).map((r, i) => (
              <tr key={r.id ?? r.slug ?? r.key ?? i} className={onRow ? 'is-click' : ''} onClick={onRow ? () => onRow(r) : undefined} tabIndex={onRow ? 0 : undefined} onKeyDown={onRow ? (e) => e.key === 'Enter' && onRow(r) : undefined}>
                {cols.map((c) => (
                  <td key={c.key} className={c.num ? 'is-num' : ''} data-label={c.label}>
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > shown && (
        <div className="adm-more">
          <button type="button" className="cd-btn cd-btn--sm" onClick={() => setShown((n) => n + max)}>
            Show more ({fmt(sorted.length - shown)} left)
          </button>
        </div>
      )}
    </>
  );
}

const Pill = ({ tone = '', children }) => <span className={`adm-pill ${tone ? `is-${tone}` : ''}`}>{children}</span>;
const passTone = (s) => ({ verified: 'ok', pending: 'warn', rejected: 'bad' })[s] ?? '';

/* ------------------------------------------------------------------ Overview */

export function Overview({ stats, data, go, isSuper }) {
  const t = stats.totals;
  const s = data.settings;
  const regOpen = s.registration?.open === true;
  const maint = s.site?.maintenance === true;
  const payOpen = s.payment?.open === true;
  const empty = stats.events.filter((e) => !e.regs);
  return (
    <>
      <PageHead title="Overview">Everything happening across CUBYC Fest, live from the database.</PageHead>

      <div className="adm-status">
        <button type="button" className={`adm-status__item ${regOpen ? 'is-ok' : 'is-bad'}`} onClick={() => isSuper && go('controls')}>
          <i /> Registration {regOpen ? 'open' : 'closed'}
        </button>
        <button type="button" className={`adm-status__item ${maint ? 'is-bad' : 'is-ok'}`} onClick={() => isSuper && go('controls')}>
          <i /> {maint ? 'Maintenance mode ON' : 'Website live'}
        </button>
        <button type="button" className={`adm-status__item ${payOpen ? 'is-ok' : ''}`} onClick={() => isSuper && go('controls')}>
          <i /> Payments {payOpen ? 'open' : 'not open yet'}
        </button>
      </div>

      <div className="adm-kpis">
        <Kpi icon="users" label="Sign-ups" value={fmt(t.users)} sub={`${fmt(t.complete)} profiles complete`} />
        <Kpi icon="solo" label="Participants" value={fmt(t.participants)} sub={`registered for an event · avg ${t.avgEvents.toFixed(1)} events`} />
        <Kpi icon="events" label="Registrations" value={fmt(t.registrations)} sub={`${fmt(t.individual)} individual · ${fmt(t.teamRegs)} in teams`} />
        <Kpi icon="team" label="Teams" value={fmt(t.teams)} sub={`${fmt(t.readyTeams)} have enough members`} />
        <Kpi icon="ticket" label="Fest passes" value={fmt(t.pass.verified)} sub={`verified · ${fmt(t.pass.pending)} waiting for review`} tone="gold" />
        <Kpi icon="rupee" label="Revenue" value={rupees(t.revenue)} sub="from verified fest passes" tone="gold" />
      </div>

      <div className="adm-grid">
        <Panel title="Registrations by department" aside={<button type="button" className="cd-link" onClick={() => go('departments')}>Details <Icon name="arrow" className="h-3.5 w-3.5" /></button>}>
          <BarList data={[...stats.depts].sort((a, b) => b.regs - a.regs).map((d) => ({ key: d.key, label: d.name, value: d.regs, sub: `${d.events} events · ${d.people} people` }))} empty="No registrations yet." />
        </Panel>
        <Panel title="Most registered events" aside={<button type="button" className="cd-link" onClick={() => go('events')}>All 27 <Icon name="arrow" className="h-3.5 w-3.5" /></button>}>
          <BarList data={[...stats.events].sort((a, b) => b.regs - a.regs).map((e) => ({ key: e.slug, label: e.name, value: e.regs, sub: e.deptName }))} limit={8} empty="No registrations yet." />
        </Panel>
        <Panel title="Registrations per day">
          <DayColumns data={stats.trend.map((d) => ({ date: d.date, value: d.regs }))} label="registrations" />
        </Panel>
        <Panel title="Sign-ups per day">
          <DayColumns data={stats.trend.map((d) => ({ date: d.date, value: d.signups }))} label="sign-ups" />
        </Panel>
        <Panel title="Christites and other colleges">
          <Split data={stats.splits.origin} />
          <p className="adm-note">Christites: a christuniversity.in email or “Christ” in the college name.</p>
        </Panel>
        <Panel title="Fest pass status">
          <BarList
            data={['verified', 'pending', 'rejected', 'none'].map((k) => ({ key: k, label: PASS[k], value: t.pass[k] ?? 0 }))}
            max={Math.max(1, t.users)}
            empty="No accounts yet."
          />
        </Panel>
        <Panel title="Top colleges">
          <BarList data={stats.splits.college} limit={8} empty="No completed profiles yet." />
        </Panel>
        <Panel title="Gender">
          <BarList data={stats.splits.gender} empty="No completed profiles yet." />
        </Panel>
        <Panel title="Year of study">
          <BarList data={stats.splits.year} empty="No completed profiles yet." />
        </Panel>
        <Panel title="States">
          <BarList data={stats.splits.state} limit={8} empty="No completed profiles yet." />
        </Panel>
        <Panel title={`Events with no registrations yet (${empty.length})`} className="adm-span">
          {empty.length ? (
            <ul className="adm-tags">
              {empty.map((e) => (
                <li key={e.slug}>
                  {e.name} <small>{e.deptName}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">Every event has at least one registration.</p>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Events */

function EventModal({ event, data, stats, isSuper, run, onClose }) {
  const [ask, setAsk] = useState(null);
  const regs = data.registrations.filter((r) => r.slug === event.slug);
  const teams = data.teams.filter((t) => t.slug === event.slug);
  const teamOf = (id) => teams.find((t) => t.id === id);
  const rows = regs.map((r) => {
    const u = stats.byUid.get(r.uid);
    const t = r.teamId ? teamOf(r.teamId) : null;
    return { id: r.id, r, u, t, name: u?.profile?.name ?? r.name, cubycId: r.cubycId, email: u?.email ?? '', phone: u?.profile?.phone ?? '', college: u?.profile?.college ?? '', team: t?.name ?? '', role: t ? (t.leaderUid === r.uid ? 'Leader' : 'Member') : '', pass: u?.pass?.status ?? 'none', at: r.createdAt?.toMillis?.() ?? 0 };
  });
  const exportCsv = () =>
    downloadCsv(
      `${event.slug}-participants-${stamp()}.csv`,
      rows.map((x) => personRow(x.u, { Event: event.name, Team: x.team, 'Team code': x.t?.id ?? '', 'Team role': x.role, Registered: when(x.r.createdAt) })),
    );
  return (
    <Modal label={event.name} onClose={onClose} wide>
      <p className="cd-label">
        {event.deptName} · {event.team ? `Team of ${event.min === event.max ? event.min : `${event.min}–${event.max}`}` : 'Individual'}
      </p>
      <h2 className="cd-modal__title">{event.name}</h2>
      <p className="adm-meta">
        <span>
          <Icon name="clock" className="h-3.5 w-3.5" /> {event.when}
        </span>
        <span>
          <Icon name="pin" className="h-3.5 w-3.5" /> {event.venue}
        </span>
        <span>
          <Icon name="users" className="h-3.5 w-3.5" /> {fmt(event.regs)} registered{event.team ? ` · ${fmt(event.teams)} teams (${fmt(event.readyTeams)} ready)` : ''}
        </span>
      </p>
      <div className="cd-actions">
        <button type="button" className="cd-btn cd-btn--sm" onClick={exportCsv} disabled={!rows.length}>
          <Icon name="download" className="h-3.5 w-3.5" /> Export participants (Excel)
        </button>
      </div>
      {event.team && teams.length > 0 && (
        <>
          <h3 className="adm-sub">Teams</h3>
          <Table
            rows={teams.map((t) => ({ ...t, n: t.memberUids.length }))}
            cols={[
              { key: 'name', label: 'Team' },
              { key: 'id', label: 'Code' },
              { key: 'leaderName', label: 'Leader' },
              { key: 'n', label: 'Members', num: true, render: (t) => `${t.n} / ${event.max}` },
              { key: 'ready', label: 'Status', sortable: false, render: (t) => (t.n >= event.min ? <Pill tone="ok">Ready</Pill> : <Pill tone="warn">Needs {event.min - t.n}</Pill>) },
              ...(isSuper
                ? [{ key: 'x', label: '', sortable: false, render: (t) => (<button type="button" className="cd-link cd-link--quiet" onClick={(e) => (e.stopPropagation(), setAsk({ kind: 'team', t }))}>Dismantle</button>) }]
                : []),
            ]}
          />
        </>
      )}
      <h3 className="adm-sub">Participants</h3>
      <Table
        rows={rows}
        initialSort={{ key: 'at', dir: 'desc' }}
        empty="No one has registered yet."
        cols={[
          { key: 'name', label: 'Name' },
          { key: 'cubycId', label: 'CUBYC ID' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'college', label: 'College' },
          ...(event.team ? [{ key: 'team', label: 'Team', render: (x) => (x.team ? `${x.team}${x.role === 'Leader' ? ' ★' : ''}` : '—') }] : []),
          { key: 'pass', label: 'Fest pass', render: (x) => <Pill tone={passTone(x.pass)}>{PASS[x.pass] ?? x.pass}</Pill> },
          { key: 'at', label: 'Registered', render: (x) => when(x.r.createdAt) },
          ...(isSuper
            ? [{ key: 'x', label: '', sortable: false, render: (x) => (<button type="button" className="cd-link cd-link--quiet" onClick={(e) => (e.stopPropagation(), setAsk({ kind: 'reg', x }))}>Remove</button>) }]
            : []),
        ]}
      />
      {ask?.kind === 'reg' && (
        <Confirm
          danger
          title={`Remove ${ask.x.name} from ${event.name}?`}
          body={ask.x.t ? `They’re also taken off team “${ask.x.t.name}”. Their time slot is freed. This can’t be undone.` : 'Their registration is deleted and the time slot freed. This can’t be undone.'}
          label="Remove"
          onCancel={() => setAsk(null)}
          onConfirm={async () => {
            if (await run((me) => api.removeRegistration(me, ask.x.r, ask.x.t), `${ask.x.name} removed from ${event.name}.`)) setAsk(null);
          }}
        />
      )}
      {ask?.kind === 'team' && (
        <Confirm
          danger
          title={`Dismantle team “${ask.t.name}”?`}
          body={`All ${ask.t.memberUids.length} members lose their registration for ${event.name}, and the team name is freed. This can’t be undone.`}
          label="Dismantle"
          onCancel={() => setAsk(null)}
          onConfirm={async () => {
            if (await run((me) => api.dismantleTeam(me, ask.t), `Team “${ask.t.name}” dismantled.`)) setAsk(null);
          }}
        />
      )}
    </Modal>
  );
}

export function EventsView(ctx) {
  const { stats } = ctx;
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const [kind, setKind] = useState('all');
  const [open, setOpen] = useState(null);
  const rows = stats.events.filter(
    (e) => (dept === 'all' || e.dept === dept) && (kind === 'all' || (kind === 'team') === e.team) && (!q || `${e.name} ${e.deptName} ${e.venue}`.toLowerCase().includes(q.toLowerCase())),
  );
  const exportAll = () =>
    downloadCsv(
      `events-summary-${stamp()}.csv`,
      stats.events.map((e) => ({ Event: e.name, Domain: e.deptName, Type: e.team ? `Team ${e.min}–${e.max}` : 'Individual', When: e.when, Venue: e.venue, Registrations: e.regs, Teams: e.teams, 'Teams ready': e.readyTeams })),
    );
  const current = open ? stats.events.find((e) => e.slug === open) : null;
  return (
    <>
      <PageHead title="Events" aside={<button type="button" className="cd-btn cd-btn--sm" onClick={exportAll}><Icon name="download" className="h-3.5 w-3.5" /> Export summary</button>}>
        All 27 events — registrations, teams, time and venue. Open an event for its participants.
      </PageHead>
      <div className="adm-filters">
        <Search value={q} onChange={setQ} placeholder="Search events or venues" />
        <select className="adm-select" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department">
          <option value="all">All departments</option>
          {DEPT_ORDER.filter((k) => stats.events.some((e) => e.dept === k)).map((k) => (
            <option key={k} value={k}>
              {DEPARTMENTS[k].name}
            </option>
          ))}
        </select>
        <Chips value={kind} onChange={setKind} options={[['all', 'All'], ['solo', 'Individual'], ['team', 'Team']]} />
      </div>
      <Panel>
        <Table
          rows={rows}
          onRow={(e) => setOpen(e.slug)}
          initialSort={{ key: 'regs', dir: 'desc' }}
          max={50}
          cols={[
            { key: 'name', label: 'Event', render: (e) => <b className="adm-strong">{e.name}</b> },
            { key: 'deptName', label: 'Department' },
            { key: 'team', label: 'Type', sortValue: (e) => (e.team ? e.max : 1), render: (e) => (e.team ? `Team ${e.min === e.max ? e.min : `${e.min}–${e.max}`}` : 'Individual') },
            { key: 'when', label: 'When', sortValue: (e) => `${e.dayNo}${e.when}` },
            { key: 'venue', label: 'Venue' },
            { key: 'regs', label: 'Registered', num: true, render: (e) => <b className="adm-strong">{fmt(e.regs)}</b> },
            { key: 'teams', label: 'Teams', num: true, render: (e) => (e.team ? `${fmt(e.readyTeams)} / ${fmt(e.teams)}` : '—') },
          ]}
        />
      </Panel>
      {current && <EventModal {...ctx} event={current} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ Departments */

export function DepartmentsView(ctx) {
  const { stats } = ctx;
  const [open, setOpen] = useState(null);
  const [event, setEvent] = useState(null);
  const top = [...stats.depts].sort((a, b) => b.regs - a.regs)[0];
  return (
    <>
      <PageHead title="Departments">Registrations across the domains{top?.regs ? ` — ${top.name} leads with ${fmt(top.regs)}.` : '.'}</PageHead>
      <Panel title="Registrations by department">
        <BarList data={[...stats.depts].sort((a, b) => b.regs - a.regs).map((d) => ({ key: d.key, label: d.name, value: d.regs, sub: `${d.people} people · ${d.teams} teams` }))} onPick={(d) => setOpen(d.key)} empty="No registrations yet." />
      </Panel>
      <Panel title="In detail">
        <Table
          rows={stats.depts.map((d) => ({ ...d, id: d.key }))}
          onRow={(d) => setOpen(d.key)}
          initialSort={{ key: 'regs', dir: 'desc' }}
          cols={[
            { key: 'name', label: 'Department', render: (d) => <b className="adm-strong">{d.name}</b> },
            { key: 'events', label: 'Events', num: true },
            { key: 'regs', label: 'Registrations', num: true },
            { key: 'people', label: 'People', num: true },
            { key: 'teams', label: 'Teams', num: true },
          ]}
        />
      </Panel>
      {open && (
        <Modal label={DEPARTMENTS[open]?.name} onClose={() => setOpen(null)}>
          <p className="cd-label">Department</p>
          <h2 className="cd-modal__title">{DEPARTMENTS[open]?.name}</h2>
          <BarList
            data={stats.events.filter((e) => e.dept === open).map((e) => ({ key: e.slug, label: e.name, value: e.regs, sub: e.team ? `${e.teams} teams` : 'Individual' }))}
            onPick={(d) => setEvent(d.key)}
            empty="No registrations yet."
          />
        </Modal>
      )}
      {event && <EventModal {...ctx} event={stats.events.find((e) => e.slug === event)} onClose={() => setEvent(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ Participants */

function PersonModal({ u, data, isSuper, run, onClose }) {
  const [ask, setAsk] = useState(null);
  const regs = data.registrations.filter((r) => r.uid === (u.uid ?? u.id));
  const p = u.profile ?? {};
  const field = (label, v) => (
    <div>
      <dt>{label}</dt>
      <dd>{v || '—'}</dd>
    </div>
  );
  const suspended = u.status === 'suspended';
  return (
    <Modal label={p.name ?? u.email} onClose={onClose} wide>
      <p className="cd-label">
        {u.cubycId} · {suspended ? 'Suspended' : 'Active'}
      </p>
      <h2 className="cd-modal__title">{p.name || u.email}</h2>
      <dl className="adm-dl">
        {field('Email', u.email)}
        {field('Phone', p.phone)}
        {field('WhatsApp', p.whatsapp)}
        {field('Gender', p.gender)}
        {field('Date of birth', p.dob)}
        {field('College', p.college)}
        {field('Department', p.department)}
        {field('Course · year', [p.course, p.year].filter(Boolean).join(' · '))}
        {field('College ID', p.collegeId)}
        {field('City · state', [p.city, p.state].filter(Boolean).join(', '))}
        {field('Emergency contact', [p.emergencyName, p.emergencyPhone].filter(Boolean).join(' · '))}
        {field('Profile', u.profileComplete ? 'Complete' : 'Incomplete')}
        {field('Fest pass', PASS[u.pass?.status ?? 'none'])}
        {field('Joined', when(u.createdAt))}
      </dl>
      <h3 className="adm-sub">Registered events ({regs.length})</h3>
      {regs.length ? (
        <ul className="adm-list">
          {regs.map((r) => {
            const t = r.teamId ? data.teams.find((x) => x.id === r.teamId) : null;
            return (
              <li key={r.id}>
                <b>{data.__names?.[r.slug] ?? r.slug}</b>
                <small>{t ? `Team “${t.name}” (${t.id})${t.leaderUid === r.uid ? ' · leader' : ''}` : 'Individual'}</small>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="adm-empty">No events yet.</p>
      )}
      {isSuper && (
        <div className="cd-actions">
          <button type="button" className={`cd-btn cd-btn--sm ${suspended ? 'cd-btn--gold' : 'cd-btn--danger'}`} onClick={() => setAsk(suspended ? 'active' : 'suspended')}>
            {suspended ? 'Reactivate account' : 'Suspend account'}
          </button>
        </div>
      )}
      {ask && (
        <Confirm
          danger={ask === 'suspended'}
          title={ask === 'suspended' ? `Suspend ${p.name || u.email}?` : `Reactivate ${p.name || u.email}?`}
          body={ask === 'suspended' ? 'They can still sign in but can’t change details, register or join teams until reactivated.' : 'They can use their dashboard and register again.'}
          label={ask === 'suspended' ? 'Suspend' : 'Reactivate'}
          onCancel={() => setAsk(null)}
          onConfirm={async () => {
            if (await run((me) => api.setUserStatus(me, u, ask), ask === 'suspended' ? 'Account suspended.' : 'Account reactivated.')) {
              setAsk(null);
              onClose();
            }
          }}
        />
      )}
    </Modal>
  );
}

export function PeopleView(ctx) {
  const { data, stats } = ctx;
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');
  const [open, setOpen] = useState(null);
  const names = useMemo(() => Object.fromEntries(stats.events.map((e) => [e.slug, e.name])), [stats]);
  const regsOf = useMemo(() => {
    const m = new Map();
    for (const r of data.registrations) (m.get(r.uid) ?? m.set(r.uid, []).get(r.uid)).push(r);
    return m;
  }, [data]);
  const rows = data.users
    .map((u) => ({ ...u, id: u.id, name: u.profile?.name ?? '', events: (regsOf.get(u.uid ?? u.id) ?? []).length, college: u.profile?.college ?? '', phone: u.profile?.phone ?? '', joined: u.createdAt?.toMillis?.() ?? 0 }))
    .filter((u) => {
      if (f === 'registered' && !u.events) return false;
      if (f === 'none' && u.events) return false;
      if (f === 'incomplete' && u.profileComplete) return false;
      if (f === 'suspended' && u.status !== 'suspended') return false;
      if (!q) return true;
      return `${u.name} ${u.email} ${u.cubycId} ${u.college} ${u.phone}`.toLowerCase().includes(q.toLowerCase());
    });
  const exportCsv = () =>
    downloadCsv(
      `participants-${stamp()}.csv`,
      rows.map((u) => personRow(u, { Status: u.status, 'Profile complete': u.profileComplete ? 'Yes' : 'No', Events: (regsOf.get(u.uid ?? u.id) ?? []).map((r) => names[r.slug] ?? r.slug).join('; '), Joined: when(u.createdAt) })),
    );
  const person = open ? data.users.find((u) => u.id === open) : null;
  return (
    <>
      <PageHead title="Participants" aside={<button type="button" className="cd-btn cd-btn--sm" onClick={exportCsv} disabled={!rows.length}><Icon name="download" className="h-3.5 w-3.5" /> Export ({fmt(rows.length)})</button>}>
        Everyone who has signed in. Open a person for their details and events.
      </PageHead>
      <div className="adm-filters">
        <Search value={q} onChange={setQ} placeholder="Name, email, CUBYC ID, college or phone" />
        <Chips value={f} onChange={setF} options={[['all', 'All'], ['registered', 'Registered'], ['none', 'No events'], ['incomplete', 'Profile incomplete'], ['suspended', 'Suspended']]} />
      </div>
      <Panel>
        <Table
          rows={rows}
          onRow={(u) => setOpen(u.id)}
          initialSort={{ key: 'joined', dir: 'desc' }}
          empty="No one matches."
          cols={[
            { key: 'name', label: 'Name', render: (u) => <b className="adm-strong">{u.name || '—'}</b> },
            { key: 'cubycId', label: 'CUBYC ID' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'college', label: 'College' },
            { key: 'events', label: 'Events', num: true },
            { key: 'pass', label: 'Fest pass', sortValue: (u) => u.pass?.status ?? 'none', render: (u) => <Pill tone={passTone(u.pass?.status)}>{PASS[u.pass?.status ?? 'none']}</Pill> },
            { key: 'status', label: 'Status', render: (u) => (u.status === 'suspended' ? <Pill tone="bad">Suspended</Pill> : u.profileComplete ? <Pill tone="ok">Complete</Pill> : <Pill>Incomplete</Pill>) },
            { key: 'joined', label: 'Joined', render: (u) => when(u.createdAt) },
          ]}
        />
      </Panel>
      {person && <PersonModal {...ctx} data={{ ...data, __names: names }} u={person} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ Teams */

export function TeamsView(ctx) {
  const { data, stats, isSuper, run } = ctx;
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');
  const [open, setOpen] = useState(null);
  const [ask, setAsk] = useState(false);
  const evBy = useMemo(() => Object.fromEntries(stats.events.map((e) => [e.slug, e])), [stats]);
  const rows = data.teams
    .map((t) => {
      const e = evBy[t.slug] ?? { name: t.slug, min: 1, max: 1 };
      const n = t.memberUids?.length ?? 0;
      return { ...t, event: e.name, n, need: Math.max(0, e.min - n), max: e.max, at: t.createdAt?.toMillis?.() ?? 0 };
    })
    .filter((t) => (f === 'all' || (f === 'ready' ? !t.need : t.need)) && (!q || `${t.name} ${t.id} ${t.event} ${t.leaderName}`.toLowerCase().includes(q.toLowerCase())));
  const exportCsv = () =>
    downloadCsv(
      `teams-${stamp()}.csv`,
      rows.flatMap((t) => t.members.map((m) => ({ Team: t.name, Code: t.id, Event: t.event, Role: m.uid === t.leaderUid ? 'Leader' : 'Member', ...personRow(stats.byUid.get(m.uid), { Name: m.name, 'CUBYC ID': m.cubycId }) }))),
    );
  const team = open ? rows.find((t) => t.id === open) : null;
  return (
    <>
      <PageHead title="Teams" aside={<button type="button" className="cd-btn cd-btn--sm" onClick={exportCsv} disabled={!rows.length}><Icon name="download" className="h-3.5 w-3.5" /> Export with members</button>}>
        Every team, its leader and members.
      </PageHead>
      <div className="adm-filters">
        <Search value={q} onChange={setQ} placeholder="Team name, code, event or leader" />
        <Chips value={f} onChange={setF} options={[['all', 'All'], ['ready', 'Ready'], ['short', 'Needs members']]} />
      </div>
      <Panel>
        <Table
          rows={rows}
          onRow={(t) => setOpen(t.id)}
          initialSort={{ key: 'at', dir: 'desc' }}
          empty="No teams yet."
          cols={[
            { key: 'name', label: 'Team', render: (t) => <b className="adm-strong">{t.name}</b> },
            { key: 'id', label: 'Code' },
            { key: 'event', label: 'Event' },
            { key: 'leaderName', label: 'Leader' },
            { key: 'n', label: 'Members', num: true, render: (t) => `${t.n} / ${t.max}` },
            { key: 'need', label: 'Status', render: (t) => (t.need ? <Pill tone="warn">Needs {t.need}</Pill> : <Pill tone="ok">Ready</Pill>) },
            { key: 'at', label: 'Created', render: (t) => when(t.createdAt) },
          ]}
        />
      </Panel>
      {team && (
        <Modal label={team.name} onClose={() => setOpen(null)} wide>
          <p className="cd-label">
            {team.event} · {team.id}
          </p>
          <h2 className="cd-modal__title">{team.name}</h2>
          <Table
            rows={team.members.map((m) => {
              const u = stats.byUid.get(m.uid);
              return { id: m.uid, name: m.name, cubycId: m.cubycId, email: u?.email ?? '', phone: u?.profile?.phone ?? '', college: u?.profile?.college ?? '', role: m.uid === team.leaderUid ? 'Leader' : 'Member', pass: u?.pass?.status ?? 'none' };
            })}
            cols={[
              { key: 'name', label: 'Name', render: (m) => <b className="adm-strong">{m.name}</b> },
              { key: 'role', label: 'Role' },
              { key: 'cubycId', label: 'CUBYC ID' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'college', label: 'College' },
              { key: 'pass', label: 'Fest pass', render: (m) => <Pill tone={passTone(m.pass)}>{PASS[m.pass]}</Pill> },
            ]}
          />
          {isSuper && (
            <div className="cd-actions">
              <button type="button" className="cd-btn cd-btn--sm cd-btn--danger" onClick={() => setAsk(true)}>
                <Icon name="trash" className="h-3.5 w-3.5" /> Dismantle team
              </button>
            </div>
          )}
          {ask && (
            <Confirm
              danger
              title={`Dismantle “${team.name}”?`}
              body={`All ${team.n} members lose their registration for ${team.event}, and the name is freed. This can’t be undone.`}
              label="Dismantle"
              onCancel={() => setAsk(false)}
              onConfirm={async () => {
                if (await run((me) => api.dismantleTeam(me, team), `Team “${team.name}” dismantled.`)) {
                  setAsk(false);
                  setOpen(null);
                }
              }}
            />
          )}
        </Modal>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Announcements */

const TAGS = ['General', 'Registrations', 'Schedule', 'Rules', 'Payments', 'Results', 'Urgent'];

function AnnouncementEditor({ initial, onClose, run }) {
  const [a, setA] = useState(() => initial ?? { title: '', body: '', tag: 'General', link: '', pinned: false, published: true });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setA({ ...a, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async (published) => {
    if (!a.title.trim()) return setMsg('Give it a title.');
    if (!a.body.trim()) return setMsg('Write the message.');
    if (a.link && !/^(https:\/\/|\/)[^\s<>"]*$/.test(a.link.trim())) return setMsg('The link must start with https:// (or / for a page on this site).');
    const ok = await run((me) => api.saveAnnouncement(me, { ...a, published }), published ? 'Published — every participant sees it now.' : 'Saved as a draft.');
    if (ok) onClose();
    return undefined;
  };
  return (
    <Modal label="Announcement" onClose={onClose} wide>
      <p className="cd-label">{initial ? 'Edit announcement' : 'New announcement'}</p>
      <h2 className="cd-modal__title">{a.title || 'Untitled announcement'}</h2>
      <div className="adm-form">
        <label>
          <span>Title</span>
          <input value={a.title} onChange={set('title')} maxLength={140} placeholder="e.g. Registrations close on 25 January" />
        </label>
        <label>
          <span>Label</span>
          <select value={a.tag} onChange={set('tag')}>
            {[...new Set([...TAGS, a.tag])].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="adm-form__wide">
          <span>Message</span>
          <textarea value={a.body} onChange={set('body')} maxLength={3000} rows={6} placeholder="What everyone should know…" />
          <small>{a.body.length} / 3000</small>
        </label>
        <label className="adm-form__wide">
          <span>Link (optional)</span>
          <input value={a.link} onChange={set('link')} maxLength={300} placeholder="https://… or /schedule" />
        </label>
        <label className="adm-check">
          <input type="checkbox" checked={a.pinned} onChange={set('pinned')} /> Pin to the top
        </label>
      </div>
      <p className="adm-sub">Preview</p>
      <article className="cd-panel cd-note adm-preview">
        <Frame />
        <p className="cd-note__meta">
          <span className="cd-tag">{a.tag}</span>
          {a.pinned && <span className="cd-tag cd-tag--gold">Pinned</span>}
          <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </p>
        <h3 className="cd-note__title">{a.title || 'Title'}</h3>
        <p className="cd-note__body">{a.body || 'Your message appears here.'}</p>
      </article>
      {msg && <p className="cd-msg is-bad">{msg}</p>}
      <div className="cd-actions">
        <button type="button" className="cd-btn" onClick={() => save(false)}>
          Save as draft
        </button>
        <button type="button" className="cd-btn cd-btn--gold" onClick={() => save(true)}>
          Publish to everyone
        </button>
      </div>
    </Modal>
  );
}

export function AnnouncementsView({ data, isSuper, run }) {
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const list = [...data.announcements].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.date).localeCompare(String(a.date)));
  return (
    <>
      <PageHead title="Announcements" aside={isSuper && <button type="button" className="cd-btn cd-btn--gold cd-btn--sm" onClick={() => setEdit('new')}><Icon name="plus" className="h-3.5 w-3.5" /> New announcement</button>}>
        Published announcements appear on every participant’s Announcements page straight away.
      </PageHead>
      {list.length === 0 ? (
        <Panel>
          <p className="adm-empty">No announcements yet. Until you publish one, participants see the built-in welcome notes.</p>
        </Panel>
      ) : (
        <ol className="cd-feed">
          {list.map((a) => (
            <li key={a.id} className={`cd-panel cd-note ${a.pinned ? 'is-pinned' : ''}`}>
              <Frame />
              <p className="cd-note__meta">
                <span className="cd-tag">{a.tag}</span>
                {a.pinned && <span className="cd-tag cd-tag--gold">Pinned</span>}
                <Pill tone={a.published ? 'ok' : ''}>{a.published ? 'Published' : 'Draft'}</Pill>
                <span>{a.date}</span>
              </p>
              <h3 className="cd-note__title">{a.title}</h3>
              <p className="cd-note__body">{a.body}</p>
              {a.link && <p className="adm-note">Link: {a.link}</p>}
              <p className="adm-note">Last change by {a.updatedBy} · {when(a.updatedAt)}</p>
              {isSuper && (
                <div className="cd-actions">
                  <button type="button" className="cd-btn cd-btn--sm" onClick={() => setEdit(a)}>
                    <Icon name="edit" className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button type="button" className="cd-btn cd-btn--sm" onClick={() => run((me) => api.saveAnnouncement(me, { ...a, published: !a.published }), a.published ? 'Unpublished — hidden from participants.' : 'Published.')}>
                    {a.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button type="button" className="cd-link cd-link--quiet" onClick={() => setDel(a)}>
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {edit && <AnnouncementEditor initial={edit === 'new' ? null : edit} run={run} onClose={() => setEdit(null)} />}
      {del && (
        <Confirm
          danger
          title={`Delete “${del.title}”?`}
          body="It disappears for everyone. This can’t be undone (unpublish instead to keep it as a draft)."
          label="Delete"
          onCancel={() => setDel(null)}
          onConfirm={async () => {
            if (await run((me) => api.deleteAnnouncement(me, del.id, del.title), 'Announcement deleted.')) setDel(null);
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Controls (super admins) */

function Toggle({ on, onLabel, offLabel, onClick, danger }) {
  return (
    <button type="button" className={`adm-toggle ${on ? 'is-on' : ''} ${danger ? 'is-danger' : ''}`} onClick={onClick} role="switch" aria-checked={on}>
      <span className="adm-toggle__knob" aria-hidden="true" />
      <b>{on ? onLabel : offLabel}</b>
    </button>
  );
}

export function ControlsView({ data, run }) {
  const s = data.settings;
  const regOpen = s.registration?.open === true;
  const maint = s.site?.maintenance === true;
  const [message, setMessage] = useState(s.site?.message ?? 'We’re making a few improvements. The site will be back shortly.');
  const [ask, setAsk] = useState(null);
  const [pay, setPay] = useState(() => ({ open: false, christite: 400, external: 500, payee: '', upiId: '', bank: '', account: '', ifsc: '', portalUrl: '', instructions: '', ...(s.payment ?? {}) }));
  const setP = (k) => (e) => setPay({ ...pay, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const by = (x) => (x?.updatedBy ? `Last changed by ${x.updatedBy} · ${when(x.updatedAt)}` : 'Never changed');
  return (
    <>
      <PageHead title="Controls">The switches for the whole website. Every change is logged.</PageHead>
      <div className="adm-grid">
        <Panel title="Event registration">
          <p className="adm-lead">{regOpen ? 'Open — participants can register, create and join teams, and withdraw.' : 'Closed — nobody can register, join, withdraw or dismantle teams.'}</p>
          <Toggle on={regOpen} onLabel="Registration open" offLabel="Registration closed" onClick={() => setAsk(regOpen ? 'reg-close' : 'reg-open')} />
          <p className="adm-note">{by(s.registration)}</p>
        </Panel>
        <Panel title="Maintenance mode">
          <p className="adm-lead">{maint ? 'ON — the public website shows the message below to everyone.' : 'Off — the website is live for everyone.'}</p>
          <div className="adm-form adm-form--one">
            <label>
              <span>Message shown to visitors</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={400} rows={3} />
            </label>
          </div>
          <Toggle danger on={maint} onLabel="Maintenance ON" offLabel="Website live" onClick={() => setAsk(maint ? 'maint-off' : 'maint-on')} />
          {maint && (
            <button type="button" className="cd-link" onClick={() => run((me) => api.setMaintenance(me, true, message), 'Message updated.')}>
              Update the message only
            </button>
          )}
          <p className="adm-note">{by(s.site)} · This portal keeps working during maintenance.</p>
        </Panel>
      </div>

      <Panel title="Fest pass payment">
        <p className="adm-lead">Fees and how to pay — shown to participants when payments open. (Uploading proof and verifying payments come in the next stage.)</p>
        <form
          className="adm-form"
          onSubmit={(e) => {
            e.preventDefault();
            run((me) => api.savePayment(me, pay), 'Payment settings saved.');
          }}
        >
          <label className="adm-check adm-form__wide">
            <input type="checkbox" checked={Boolean(pay.open)} onChange={setP('open')} /> Payments open
          </label>
          <label>
            <span>Christites (₹)</span>
            <input type="number" min="0" max="100000" value={pay.christite} onChange={setP('christite')} />
          </label>
          <label>
            <span>Other colleges (₹)</span>
            <input type="number" min="0" max="100000" value={pay.external} onChange={setP('external')} />
          </label>
          <label>
            <span>Pay to (name)</span>
            <input value={pay.payee} onChange={setP('payee')} maxLength={120} />
          </label>
          <label>
            <span>UPI ID</span>
            <input value={pay.upiId} onChange={setP('upiId')} maxLength={80} />
          </label>
          <label>
            <span>Bank</span>
            <input value={pay.bank} onChange={setP('bank')} maxLength={120} />
          </label>
          <label>
            <span>Account number</span>
            <input value={pay.account} onChange={setP('account')} maxLength={40} />
          </label>
          <label>
            <span>IFSC</span>
            <input value={pay.ifsc} onChange={setP('ifsc')} maxLength={20} />
          </label>
          <label>
            <span>Payment portal link</span>
            <input value={pay.portalUrl} onChange={setP('portalUrl')} maxLength={300} placeholder="https://…" />
          </label>
          <label className="adm-form__wide">
            <span>Instructions</span>
            <textarea value={pay.instructions} onChange={setP('instructions')} maxLength={1500} rows={4} />
          </label>
          <div className="cd-actions adm-form__wide">
            <button type="submit" className="cd-btn cd-btn--gold">
              Save payment settings
            </button>
            <span className="adm-note">{by(s.payment)}</span>
          </div>
        </form>
      </Panel>

      {ask === 'reg-open' && <Confirm title="Open registration?" body="Participants can register, create and join teams straight away." label="Open registration" onCancel={() => setAsk(null)} onConfirm={async () => (await run((me) => api.setRegistrationOpen(me, true), 'Registration is open.')) && setAsk(null)} />}
      {ask === 'reg-close' && <Confirm danger title="Close registration?" body="Nobody can register, join, withdraw or dismantle teams until you open it again. Existing registrations stay." label="Close registration" onCancel={() => setAsk(null)} onConfirm={async () => (await run((me) => api.setRegistrationOpen(me, false), 'Registration is closed.')) && setAsk(null)} />}
      {ask === 'maint-on' && <Confirm danger title="Turn on maintenance mode?" body="Every visitor sees the maintenance message instead of the website until you turn it off. This portal keeps working." label="Turn on" onCancel={() => setAsk(null)} onConfirm={async () => (await run((me) => api.setMaintenance(me, true, message), 'Maintenance mode is ON.')) && setAsk(null)} />}
      {ask === 'maint-off' && <Confirm title="Bring the website back?" body="Everyone can use the website again straight away." label="Go live" onCancel={() => setAsk(null)} onConfirm={async () => (await run((me) => api.setMaintenance(me, false, message), 'The website is live.')) && setAsk(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ Admins (super admins) */

export function AdminsView({ data, run, me }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [msg, setMsg] = useState(null);
  const [del, setDel] = useState(null);
  const roots = api.ROOT_SUPERADMINS;
  const add = async (e) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setMsg('Enter a full email address.');
    if (roots.includes(em) || em === me.email) return setMsg('That account already has full access.');
    setMsg(null);
    if (await run((m) => api.grantRole(m, em, role), `${em} can now sign in as ${role === 'superadmin' ? 'a super admin' : 'an admin'}.`)) setEmail('');
    return undefined;
  };
  return (
    <>
      <PageHead title="Admins & access">Only the emails listed here can open this portal. They sign in with that Google account.</PageHead>
      <Panel title="Give someone access">
        <form className="adm-form" onSubmit={add}>
          <label>
            <span>Google email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@christuniversity.in" autoComplete="off" />
          </label>
          <label>
            <span>Access</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">Admin — view only</option>
              <option value="superadmin">Super admin — full control</option>
            </select>
          </label>
          <div className="cd-actions adm-form__wide">
            <button type="submit" className="cd-btn cd-btn--gold">
              <Icon name="plus" className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </form>
        {msg && <p className="cd-msg is-bad">{msg}</p>}
      </Panel>
      <Panel title="People with access">
        <Table
          rows={[
            ...roots.map((e) => ({ id: e, email: e, role: 'root', grantedBy: 'Built in', at: 0 })),
            ...data.roles.filter((r) => !roots.includes(r.id)).map((r) => ({ id: r.id, email: r.id, role: r.role, grantedBy: r.grantedBy, at: r.grantedAt?.toMillis?.() ?? 0, grantedAt: r.grantedAt })),
          ]}
          cols={[
            { key: 'email', label: 'Email', render: (r) => <b className="adm-strong">{r.email}{r.email === me.email ? ' (you)' : ''}</b> },
            { key: 'role', label: 'Access', render: (r) => (r.role === 'root' ? <Pill tone="gold">Super admin · permanent</Pill> : r.role === 'superadmin' ? <Pill tone="gold">Super admin</Pill> : <Pill>Admin · view only</Pill>) },
            { key: 'grantedBy', label: 'Added by', render: (r) => (r.role === 'root' ? 'Built in' : `${r.grantedBy} · ${when(r.grantedAt)}`) },
            {
              key: 'x',
              label: '',
              sortable: false,
              render: (r) =>
                r.role === 'root' || r.email === me.email ? null : (
                  <span className="adm-row-actions">
                    <button type="button" className="cd-link cd-link--quiet" onClick={() => run((m) => api.grantRole(m, r.email, r.role === 'superadmin' ? 'admin' : 'superadmin'), 'Access changed.')}>
                      Make {r.role === 'superadmin' ? 'admin' : 'super admin'}
                    </button>
                    <button type="button" className="cd-link cd-link--quiet" onClick={() => setDel(r.email)}>
                      Remove
                    </button>
                  </span>
                ),
            },
          ]}
        />
      </Panel>
      {del && <Confirm danger title={`Remove ${del}?`} body="They lose access to this portal immediately." label="Remove access" onCancel={() => setDel(null)} onConfirm={async () => (await run((m) => api.revokeRole(m, del), 'Access removed.')) && setDel(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ Activity log (super admins) */

const ACTIONS = {
  'registration.open': 'Opened registration',
  'registration.close': 'Closed registration',
  'maintenance.on': 'Turned maintenance ON',
  'maintenance.off': 'Turned maintenance off',
  'payment.settings': 'Changed payment settings',
  'announcement.create': 'Created an announcement',
  'announcement.edit': 'Edited an announcement',
  'announcement.delete': 'Deleted an announcement',
  'role.grant': 'Gave access',
  'role.revoke': 'Removed access',
  'user.suspend': 'Suspended an account',
  'user.reactivate': 'Reactivated an account',
  'registration.remove': 'Removed a registration',
  'team.dismantle': 'Dismantled a team',
};

export function ActivityView({ data }) {
  const [q, setQ] = useState('');
  const detail = (l) => {
    const d = l.details ?? {};
    return [d.title, d.role, d.email, d.name, d.slug, d.message].filter(Boolean).join(' · ');
  };
  const rows = data.logs.map((l) => ({ ...l, what: ACTIONS[l.action] ?? l.action, detail: detail(l), t: l.at?.toMillis?.() ?? 0 })).filter((l) => !q || `${l.what} ${l.actorEmail} ${l.target} ${l.detail}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHead
        title="Activity log"
        aside={<button type="button" className="cd-btn cd-btn--sm" onClick={() => downloadCsv(`activity-${stamp()}.csv`, rows.map((l) => ({ When: when(l.at), Who: l.actorEmail, Action: l.what, Target: l.target, Details: l.detail })))} disabled={!rows.length}><Icon name="download" className="h-3.5 w-3.5" /> Export</button>}
      >
        Every change made from this portal — who, what and when. Entries can’t be edited or deleted.
      </PageHead>
      <div className="adm-filters">
        <Search value={q} onChange={setQ} placeholder="Search the log" />
      </div>
      <Panel>
        <Table
          rows={rows}
          initialSort={{ key: 't', dir: 'desc' }}
          empty="Nothing logged yet."
          cols={[
            { key: 't', label: 'When', render: (l) => when(l.at) },
            { key: 'actorEmail', label: 'Who' },
            { key: 'what', label: 'Action', render: (l) => <b className="adm-strong">{l.what}</b> },
            { key: 'detail', label: 'Details' },
            { key: 'target', label: 'Record' },
          ]}
        />
      </Panel>
    </>
  );
}
