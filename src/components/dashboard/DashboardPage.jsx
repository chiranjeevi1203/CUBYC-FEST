import { useEffect, useRef, useState } from 'react';
import SiteNav, { PlateStar } from '../ui/SiteNav';
import Frame from '../ui/Frame';
import { useMountedWhile, usePageShell } from '../about/usePageShell';
import { useAnnouncementList } from './useAnnouncementList';
import { useExperience } from '../../store/useExperience';
import { BACKEND, useAuth } from '../../store/useAuth';
import { useFest } from '../../store/useFest';
import Overview from './Overview';
import Register from './Register';
import Events from './Events';
import MyEvents from './MyEvents';
import MyTeam from './MyTeam';
import { LiveEvents, LiveMyEvents, LiveMyTeam } from './Live';
import { useRegs } from '../../store/useRegs';
import { Icon, PageHead, SpaceBackdrop } from './ui';
import { currentPath, go, onRoute } from '../../lib/route';

/*
 * The participant dashboard (/dashboard, /dashboard/<section>). A framed
 * panel on the left lists the sections; each one opens on the right, over a
 * blue galaxy. Everything is open from the start: the CUBYC ID is issued at
 * sign-in, events can be picked straight away, and registrations count once
 * the ₹500 payment is verified.
 */

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'register', label: 'Register & Pay', icon: 'register' },
  { key: 'events', label: 'Events', icon: 'events' },
  { key: 'my-events', label: 'My Events', icon: 'myevents' },
  { key: 'my-team', label: 'My Team', icon: 'team' },
  { key: 'announcements', label: 'Announcements', icon: 'announcements' },
];
const KEYS = SECTIONS.map((s) => s.key);
const sectionFromHash = () => {
  const k = currentPath().replace(/^\/dashboard\/?/, '');
  if (BACKEND && /^join\/[\w-]{1,16}$/.test(k)) return 'my-team';
  return KEYS.includes(k) ? k : 'overview';
};
// A team invite link (/dashboard/join/TM-XXXXXX) → the code, kept through sign-in.
const JOIN_KEY = 'cubyc-join';
const joinFromHash = () => {
  const m = currentPath().match(/^\/dashboard\/join\/([\w-]{1,16})$/);
  if (m) {
    try {
      sessionStorage.setItem(JOIN_KEY, m[1]);
    } catch {
      /* storage blocked */
    }
    return m[1];
  }
  return '';
};
const takeSavedJoin = () => {
  try {
    const c = sessionStorage.getItem(JOIN_KEY) ?? '';
    sessionStorage.removeItem(JOIN_KEY);
    return c;
  } catch {
    return '';
  }
};
const fmtDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Announcements() {
  const list = [...useAnnouncementList()].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.date.localeCompare(a.date));
  return (
    <>
      <PageHead title="Announcements">News and updates from the CUBYC team.</PageHead>
      <ol className="cd-feed">
        {list.map((a) => (
          <li key={a.id} className={`cd-panel cd-note ${a.pinned ? 'is-pinned' : ''}`} data-hero>
            <Frame />
            <p className="cd-note__meta">
              <span className="cd-tag">{a.tag}</span>
              {a.pinned && <span className="cd-tag cd-tag--gold">Pinned</span>}
              <span>{fmtDate(a.date)}</span>
            </p>
            <h3 className="cd-note__title">{a.title}</h3>
            <p className="cd-note__body">{a.body}</p>
            {a.link && (
              <a className="cd-link" href={a.link} {...(a.link.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                Open link <Icon name="arrow" className="h-3.5 w-3.5" />
              </a>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

function Sidebar({ user, active, open, onClose, onLogout, badges }) {
  return (
    <aside id="cd-side" className={`cd-side ${open ? 'is-open' : ''}`} aria-label="Dashboard menu">
      <div className="cd-side__who">
        <b>{user.name}</b>
        <small>
          CUBYC ID <span>{user.cubycId}</span>
        </small>
      </div>
      <nav className="cd-menu" aria-label="Dashboard sections">
        {SECTIONS.map((s) => (
          <a
            key={s.key}
            href={s.key === 'overview' ? '/dashboard' : `/dashboard/${s.key}`}
            className={`nv-plate nv-plate--bar cd-menu__item ${active === s.key ? 'is-active' : ''}`}
            aria-current={active === s.key ? 'page' : undefined}
            onClick={onClose}
          >
            <Icon name={s.icon} className="cd-menu__icon" />
            <span className="cd-menu__label">{s.label}</span>
            {badges[s.key] ? <span className={`cd-menu__badge ${badges[s.key] === '!' ? 'is-alert' : ''}`}>{badges[s.key]}</span> : null}
            <PlateStar />
          </a>
        ))}
      </nav>
      <div className="cd-side__end">
        <a href="#home" className="nv-plate nv-plate--bar cd-menu__item" onClick={onClose}>
          <Icon name="home" className="cd-menu__icon" />
          <span className="cd-menu__label">Back to home</span>
          <PlateStar />
        </a>
        <button type="button" className="nv-plate nv-plate--bar cd-menu__item is-out" onClick={onLogout}>
          <Icon name="logout" className="cd-menu__icon" />
          <span className="cd-menu__label">Log out</span>
          <PlateStar />
        </button>
      </div>
    </aside>
  );
}

/** Asks before signing out. */
function ConfirmLogout({ user, onCancel, onConfirm }) {
  const stayRef = useRef(null);
  useEffect(() => {
    stayRef.current?.focus();
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);
  return (
    <div className="cd-modal" role="alertdialog" aria-modal="true" aria-labelledby="cd-out-title" aria-describedby="cd-out-body" onClick={onCancel}>
      <div className="cd-modal__card cd-confirm" onClick={(e) => e.stopPropagation()}>
        <Frame />
        <Icon name="logout" className="cd-confirm__icon" />
        <h2 id="cd-out-title" className="cd-modal__title">
          Log out?
        </h2>
        <p id="cd-out-body" className="cd-modal__lead">
          You’re signed in as <b>{user.email}</b>. Your events and team are saved — you can sign back in any time.
        </p>
        <div className="cd-actions">
          <button ref={stayRef} type="button" className="cd-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="cd-btn cd-btn--danger" onClick={onConfirm}>
            Yes, log out
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ open, onGone }) {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const signOut = useAuth((s) => s.signOut);
  const loadFest = useFest((s) => s.load);
  const regsCount = useFest((s) => s.regs.length);
  const teamsCount = useFest((s) => Object.keys(s.teams).length);
  const [active, setActive] = useState(sectionFromHash);
  const [joinCode, setJoinCode] = useState(joinFromHash);
  const watchRegs = useRegs((s) => s.watch);
  const liveRegs = useRegs((s) => s.regs.length);
  const liveTeams = useRegs((s) => Object.keys(s.teams).length);
  const [drawer, setDrawer] = useState(false);
  const [askOut, setAskOut] = useState(false);
  const rootRef = usePageShell({
    open,
    onGone,
    leaveHash: '#home',
    onEnter: (tl) => {
      tl.fromTo(
        rootRef.current.querySelectorAll('.cd-side, [data-hero]'),
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.04, clearProps: 'transform' },
        0.15,
      );
    },
  });

  useEffect(() => {
    if (!BACKEND) loadFest(user?.email ?? null);
  }, [user?.email, loadFest]);
  useEffect(() => {
    if (BACKEND) watchRegs(user?.uid ?? null);
  }, [user?.uid, watchRegs]);
  // Signed in after following an invite link: take them to that team.
  useEffect(() => {
    if (!BACKEND || !user) return;
    const saved = takeSavedJoin();
    if (saved && !currentPath().startsWith('/dashboard/join/')) go(`/dashboard/join/${saved}`);
  }, [user]);
  useEffect(() => {
    const onHash = () => {
      if (!currentPath().startsWith('/dashboard')) return;
      setActive(sectionFromHash());
      setJoinCode(joinFromHash());
      setDrawer(false);
      rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    return onRoute(onHash);
  }, [rootRef]);
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      setDrawer(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [drawer]);

  const logOut = () => {
    setAskOut(false);
    signOut();
    if (BACKEND) watchRegs(null);
    else loadFest(null);
    go('/login');
  };

  const current = SECTIONS.find((s) => s.key === active);
  const badges = !user ? {} : BACKEND ? { register: user.profileComplete ? 0 : '!', 'my-events': liveRegs, 'my-team': liveTeams } : { register: user.pass.status === 'none' ? '!' : 0, 'my-events': regsCount, 'my-team': teamsCount };

  return (
    <div ref={rootRef} className="space-page cd-page fixed inset-0 z-40 overflow-y-auto overflow-x-hidden overscroll-contain" data-no-orbit>
      <SpaceBackdrop />
      <SiteNav />
      {!ready ? (
        <main className="cd-gate" aria-busy="true">
          <p className="cd-gate__loading">Opening your dashboard…</p>
        </main>
      ) : user?.status === 'suspended' ? (
        <main className="cd-gate">
          <section className="cd-panel cd-gate__card" data-hero>
            <Frame />
            <h2>Your account is on hold</h2>
            <p>Please contact the CUBYC team from the Contact page.</p>
            <button type="button" className="cd-btn" onClick={logOut}>
              Log out
            </button>
          </section>
        </main>
      ) : user ? (
        <>
          <Sidebar user={user} active={active} open={drawer} onClose={() => setDrawer(false)} onLogout={() => (setDrawer(false), setAskOut(true))} badges={badges} />
          <button type="button" className={`cd-scrim ${drawer ? 'is-open' : ''}`} aria-label="Close menu" tabIndex={drawer ? 0 : -1} onClick={() => setDrawer(false)} />
          <div className="cd-body">
            <div className="cd-mobilebar">
              <button type="button" className="cd-menubtn" onClick={() => setDrawer(true)} aria-expanded={drawer} aria-controls="cd-side">
                <Icon name="menu" /> Menu
              </button>
              <span className="cd-mobilebar__title">
                <Icon name={current.icon} /> {current.label}
              </span>
            </div>
            <main className="cd-main" key={active}>
              {active === 'overview' && <Overview user={user} />}
              {active === 'register' && <Register user={user} />}
              {active === 'events' && (BACKEND ? <LiveEvents user={user} /> : <Events user={user} />)}
              {active === 'my-events' && (BACKEND ? <LiveMyEvents user={user} /> : <MyEvents user={user} />)}
              {active === 'my-team' && (BACKEND ? <LiveMyTeam user={user} joinCode={joinCode} /> : <MyTeam user={user} />)}
              {active === 'announcements' && <Announcements />}
            </main>
          </div>
          {askOut && <ConfirmLogout user={user} onCancel={() => setAskOut(false)} onConfirm={logOut} />}
        </>
      ) : (
        <main className="cd-gate">
          <section className="cd-panel cd-gate__card" data-hero>
            <Frame />
            <Icon name="register" className="h-7 w-7" />
            <h2>Sign in to open your dashboard</h2>
            <p>Your CUBYC ID, events, team and festival ticket live here.</p>
            <a href="/login" className="cd-btn cd-btn--gold">
              Sign in with Google
            </a>
          </section>
        </main>
      )}
    </div>
  );
}

/** The participant dashboard (/dashboard). */
export default function DashboardPage() {
  const open = useExperience((s) => s.dashboardOpen);
  const [mounted, onGone] = useMountedWhile(open);
  if (!mounted) return null;
  return <DashboardView open={open} onGone={onGone} />;
}
