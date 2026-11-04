import { useEffect, useRef, useState } from 'react';
import SiteNav, { PlateStar } from '../ui/SiteNav';
import Frame from '../ui/Frame';
import { useMountedWhile, usePageShell } from '../about/usePageShell';
import { ANNOUNCEMENTS } from '../../config/announcements';
import { useExperience } from '../../store/useExperience';
import { BACKEND, useAuth } from '../../store/useAuth';
import { useFest } from '../../store/useFest';
import Overview from './Overview';
import Register from './Register';
import Events from './Events';
import MyEvents from './MyEvents';
import MyTeam from './MyTeam';
import { Icon, PageHead, SoonSection, SpaceBackdrop } from './ui';

/*
 * The participant dashboard (#/dashboard, #/dashboard/<section>). A framed
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
  const k = window.location.hash.replace(/^#\/dashboard\/?/, '');
  return KEYS.includes(k) ? k : 'overview';
};
const fmtDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Announcements() {
  const list = [...ANNOUNCEMENTS].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.date.localeCompare(a.date));
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
            href={s.key === 'overview' ? '#/dashboard' : `#/dashboard/${s.key}`}
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
    loadFest(user?.email ?? null);
  }, [user?.email, loadFest]);
  useEffect(() => {
    const onHash = () => {
      if (!window.location.hash.startsWith('#/dashboard')) return;
      setActive(sectionFromHash());
      setDrawer(false);
      rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
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
    loadFest(null);
    window.location.hash = '#/login';
  };

  const current = SECTIONS.find((s) => s.key === active);
  const badges = !user ? {} : BACKEND ? { register: user.profileComplete ? 0 : '!' } : { register: user.pass.status === 'none' ? '!' : 0, 'my-events': regsCount, 'my-team': teamsCount };

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
              {/* On the live site, event registration and teams open in the next phase. */}
              {active === 'events' &&
                (BACKEND ? <SoonSection title="Events" lead="Every event, laid out by the schedule.">Event registration opens soon. Your CUBYC ID and details are ready — you’ll pick your events here.</SoonSection> : <Events user={user} />)}
              {active === 'my-events' &&
                (BACKEND ? <SoonSection title="My Events" lead="Where to be and when.">Your registered events will appear here once event registration opens.</SoonSection> : <MyEvents user={user} />)}
              {active === 'my-team' &&
                (BACKEND ? <SoonSection title="My Team" lead="Your teams, their codes and members.">Team building opens with event registration. Your teammates will add you using your CUBYC ID.</SoonSection> : <MyTeam user={user} />)}
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
            <a href="#/login" className="cd-btn cd-btn--gold">
              Sign in with Google
            </a>
          </section>
        </main>
      )}
    </div>
  );
}

/** The participant dashboard (#/dashboard). */
export default function DashboardPage() {
  const open = useExperience((s) => s.dashboardOpen);
  const [mounted, onGone] = useMountedWhile(open);
  if (!mounted) return null;
  return <DashboardView open={open} onGone={onGone} />;
}
