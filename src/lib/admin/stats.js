/**
 * Numbers for the admin dashboard, worked out in the browser from the raw
 * collections (users, registrations, teams). Pure functions — no Firebase here.
 */
import { ALL_EVENTS } from '../../config/allEvents';
import { DEPARTMENTS, DEPT_ORDER } from '../../config/departments';
import { EVENT_TABLE } from '../fest/eventTable';
import { whenOf } from '../fest/when';

const day = (t) => {
  const d = t?.toDate ? t.toDate() : t instanceof Date ? t : null;
  return d ? d.toISOString().slice(0, 10) : null;
};
const countBy = (list, key) => {
  const m = new Map();
  for (const x of list) {
    const k = key(x);
    if (k === null || k === undefined || k === '') continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};
const isChristite = (u) => /christuniversity\.in$/i.test(u.email ?? '') || /\bchrist\b/i.test(u.profile?.college ?? '');

export function computeStats({ users, registrations, teams }) {
  const byUid = new Map(users.map((u) => [u.uid ?? u.id, u]));
  const regsBySlug = new Map();
  for (const r of registrations) (regsBySlug.get(r.slug) ?? regsBySlug.set(r.slug, []).get(r.slug)).push(r);
  const teamsBySlug = new Map();
  for (const t of teams) (teamsBySlug.get(t.slug) ?? teamsBySlug.set(t.slug, []).get(t.slug)).push(t);

  const events = ALL_EVENTS.map((e) => {
    const ev = EVENT_TABLE[e.slug] ?? { team: false, min: 1, max: 1 };
    const regs = regsBySlug.get(e.slug) ?? [];
    const ts = teamsBySlug.get(e.slug) ?? [];
    const w = whenOf(e.slug);
    return {
      slug: e.slug,
      name: e.name,
      dept: e.dept,
      deptName: DEPARTMENTS[e.dept]?.name ?? e.dept,
      team: ev.team,
      min: ev.min,
      max: ev.max,
      regs: regs.length,
      teams: ts.length,
      readyTeams: ts.filter((t) => (t.memberUids?.length ?? 0) >= ev.min).length,
      when: w ? `${w.day} · ${w.time}` : '—',
      venue: w?.venue ?? '—',
      dayNo: w?.dayNo ?? 9,
    };
  });

  const depts = DEPT_ORDER.map((key) => {
    const evs = events.filter((e) => e.dept === key);
    const regs = evs.reduce((n, e) => n + e.regs, 0);
    const people = new Set(registrations.filter((r) => evs.some((e) => e.slug === r.slug)).map((r) => r.uid)).size;
    return { key, name: DEPARTMENTS[key]?.name ?? key, events: evs.length, regs, people, teams: evs.reduce((n, e) => n + e.teams, 0) };
  }).filter((d) => d.events > 0);

  const participants = new Set(registrations.map((r) => r.uid));
  const pass = { none: 0, pending: 0, verified: 0, rejected: 0 };
  let revenue = 0;
  for (const u of users) {
    const s = u.pass?.status ?? 'none';
    pass[s] = (pass[s] ?? 0) + 1;
    if (s === 'verified') revenue += Number(u.pass?.amount) || 0;
  }

  // Sign-ups and registrations per day (for the trend line).
  const days = new Map();
  for (const u of users) {
    const d = day(u.createdAt);
    if (d) days.set(d, { ...(days.get(d) ?? { signups: 0, regs: 0 }), signups: (days.get(d)?.signups ?? 0) + 1 });
  }
  for (const r of registrations) {
    const d = day(r.createdAt);
    if (d) days.set(d, { ...(days.get(d) ?? { signups: 0, regs: 0 }), regs: (days.get(d)?.regs ?? 0) + 1 });
  }
  const trend = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));

  const profiles = users.filter((u) => u.profileComplete);
  return {
    totals: {
      users: users.length,
      complete: profiles.length,
      suspended: users.filter((u) => u.status === 'suspended').length,
      registrations: registrations.length,
      participants: participants.size,
      individual: registrations.filter((r) => r.kind === 'individual').length,
      teamRegs: registrations.filter((r) => r.kind === 'team').length,
      teams: teams.length,
      readyTeams: events.reduce((n, e) => n + e.readyTeams, 0),
      christites: users.filter(isChristite).length,
      external: users.length - users.filter(isChristite).length,
      pass,
      revenue,
      avgEvents: participants.size ? registrations.length / participants.size : 0,
    },
    events,
    depts,
    trend,
    splits: {
      gender: countBy(profiles, (u) => u.profile?.gender),
      year: countBy(profiles, (u) => u.profile?.year),
      college: countBy(profiles, (u) => u.profile?.college?.trim()),
      state: countBy(profiles, (u) => u.profile?.state?.trim()),
      origin: [
        { label: 'Christites', value: users.filter(isChristite).length },
        { label: 'Other colleges', value: users.length - users.filter(isChristite).length },
      ],
    },
    byUid,
  };
}

/** Rows → a CSV file the browser downloads (opens in Excel). */
export function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const cell = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    // Neutralise spreadsheet formulas (CSV injection) and quote everything.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csv = '﻿' + [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** One participant as a spreadsheet row. */
export function personRow(u, extra = {}) {
  const p = u?.profile ?? {};
  return {
    'CUBYC ID': u?.cubycId ?? '',
    Name: p.name ?? '',
    Email: u?.email ?? '',
    Phone: p.phone ?? '',
    WhatsApp: p.whatsapp ?? '',
    Gender: p.gender ?? '',
    College: p.college ?? '',
    Department: p.department ?? '',
    Course: p.course ?? '',
    Year: p.year ?? '',
    'College ID': p.collegeId ?? '',
    City: p.city ?? '',
    State: p.state ?? '',
    'Fest pass': u?.pass?.status ?? 'none',
    ...extra,
  };
}
