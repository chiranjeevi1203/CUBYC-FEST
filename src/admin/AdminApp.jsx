import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Frame from '../components/ui/Frame';
import { PlateStar } from '../components/ui/SiteNav';
import { Icon, SpaceBackdrop } from '../components/dashboard/ui';
import { computeStats } from '../lib/admin/stats';
import * as api from '../lib/firebase/admin';
import { AdminsView, AnnouncementsView, ActivityView, ControlsView, DepartmentsView, EventsView, Overview, PeopleView, TeamsView } from './sections';

/*
 * The admin portal (/festadmin): a separate app from the public site — no 3D, no
 * chatbot — for the people the super admin approves. Admins see everything;
 * super admins can also change things. The database rules enforce the same
 * split, so the portal can't be used to do more than the rules allow.
 */

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: 'chart' },
  { key: 'events', label: 'Events', icon: 'events' },
  { key: 'departments', label: 'Departments', icon: 'building' },
  { key: 'participants', label: 'Participants', icon: 'users' },
  { key: 'teams', label: 'Teams', icon: 'team' },
  { key: 'announcements', label: 'Announcements', icon: 'announcements' },
  { key: 'controls', label: 'Controls', icon: 'settings', superOnly: true },
  { key: 'admins', label: 'Admins & access', icon: 'shield', superOnly: true },
  { key: 'activity', label: 'Activity log', icon: 'log', superOnly: true },
];
const BASE = '/festadmin';
const sectionFromPath = () => {
  const k = window.location.pathname.replace(/\/+$/, '').slice(BASE.length + 1).split('/')[0];
  return SECTIONS.some((s) => s.key === k) ? k : 'overview';
};

function useToast() {
  const [toast, setToast] = useState(null);
  const t = useRef(0);
  const show = useCallback((text, bad = false) => {
    setToast({ text, bad });
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setToast(null), bad ? 6000 : 3200);
  }, []);
  return [toast, show];
}

/** Friendly words for errors from the database. */
function explain(err) {
  const code = err?.code ?? '';
  if (code === 'permission-denied') return 'Not allowed for your account. (Only super admins can change things.)';
  if (code === 'unavailable') return 'No connection. Check your internet and try again.';
  if (code === 'resource-exhausted') return 'The free plan’s daily database limit is reached. It resets at midnight (Pacific time) — or switch to Blaze.';
  return err?.message ? `Something went wrong: ${err.message}` : 'Something went wrong. Please try again.';
}

function Gate({ state, onSignIn, busy, error }) {
  return (
    <main className="cd-gate">
      <section className="cd-panel cd-gate__card adm-gate">
        <Frame />
        <Icon name="shield" className="h-7 w-7" />
        {state === 'loading' ? (
          <p className="cd-gate__loading">Checking your access…</p>
        ) : state === 'denied' ? (
          <>
            <h2>No access</h2>
            <p>This account isn’t on the admin list. Ask the super admin to add your email, then sign in again.</p>
            <button type="button" className="cd-btn" onClick={() => api.signOut()}>
              Use another account
            </button>
          </>
        ) : (
          <>
            <h2>CUBYC Fest admin</h2>
            <p>For the fest team only. Sign in with the Google account the super admin approved.</p>
            <button type="button" className="cd-btn cd-btn--gold" onClick={onSignIn} disabled={busy}>
              {busy ? 'Opening Google…' : 'Sign in with Google'}
            </button>
          </>
        )}
        {error && <p className="cd-msg is-bad">{error}</p>}
      </section>
    </main>
  );
}

export default function AdminApp() {
  const [auth, setAuth] = useState({ ready: false, user: null, role: null });
  const [signing, setSigning] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [active, setActive] = useState(sectionFromPath);
  const [drawer, setDrawer] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [toast, showToast] = useToast();
  const mainRef = useRef(null);
  const isSuper = auth.role === 'superadmin';

  // Search engines: never index the portal.
  useEffect(() => {
    document.title = 'Admin · CUBYC-FEST 2027';
    document.documentElement.classList.remove('is-loading');
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => api.watchAdmin(({ user, role }) => setAuth({ ready: true, user, role })), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setData(await api.loadAll(isSuper));
    } catch (err) {
      setLoadError(explain(err));
    } finally {
      setLoading(false);
    }
  }, [isSuper]);
  useEffect(() => {
    if (auth.role) refresh();
    else setData(null);
  }, [auth.role, refresh]);

  // Sections live at /festadmin/<section> (Back / Forward work).
  useEffect(() => {
    const onPop = () => setActive(sectionFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = (key) => {
    setActive(key);
    setDrawer(false);
    window.history.pushState(null, '', key === 'overview' ? BASE : `${BASE}/${key}`);
    mainRef.current?.scrollTo({ top: 0 });
  };

  const signIn = async () => {
    setSigning(true);
    setAuthError(null);
    try {
      await api.signIn();
    } catch (err) {
      if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err?.code)) setAuthError(explain(err));
    } finally {
      setSigning(false);
    }
  };

  /** Run a change (super admins), then reload the data. */
  const run = useCallback(
    async (fn, done) => {
      try {
        await fn({ uid: auth.user.uid, email: auth.user.email });
        if (done) showToast(done);
        await refresh();
        return true;
      } catch (err) {
        showToast(explain(err), true);
        return false;
      }
    },
    [auth.user, refresh, showToast],
  );

  const stats = useMemo(() => (data ? computeStats(data) : null), [data]);
  const sections = SECTIONS.filter((s) => !s.superOnly || isSuper);
  const current = sections.find((s) => s.key === active) ?? sections[0];
  const ctx = { data, stats, isSuper, me: auth.user, run, refresh, toast: showToast, go };

  const gateState = !auth.ready ? 'loading' : !auth.user ? 'signin' : !auth.role ? 'denied' : null;

  return (
    <div ref={mainRef} className="space-page cd-page adm fixed inset-0 overflow-y-auto overflow-x-hidden overscroll-contain">
      <SpaceBackdrop />
      <header className="adm-top">
        <a href={BASE} className="adm-brand" onClick={(e) => (e.preventDefault(), go('overview'))}>
          <b>CUBYC</b>
          <span>Fest admin</span>
        </a>
        {auth.user && auth.role && (
          <div className="adm-top__who">
            <span className={`adm-role ${isSuper ? 'is-super' : ''}`}>{isSuper ? 'Super admin' : 'Admin · view only'}</span>
            <span className="adm-top__email">{auth.user.email}</span>
          </div>
        )}
      </header>

      {gateState ? (
        <Gate state={gateState} onSignIn={signIn} busy={signing} error={authError} />
      ) : (
        <>
          <aside id="adm-side" className={`cd-side adm-side ${drawer ? 'is-open' : ''}`} aria-label="Admin menu">
            <div className="cd-side__who">
              <b>{auth.user.name}</b>
              <small>{isSuper ? 'Super admin' : 'Admin'}</small>
            </div>
            <nav className="cd-menu" aria-label="Admin sections">
              {sections.map((s) => (
                <a
                  key={s.key}
                  href={s.key === 'overview' ? BASE : `${BASE}/${s.key}`}
                  onClick={(e) => (e.preventDefault(), go(s.key))}
                  className={`nv-plate nv-plate--bar cd-menu__item ${current.key === s.key ? 'is-active' : ''}`}
                  aria-current={current.key === s.key ? 'page' : undefined}
                >
                  <Icon name={s.icon} className="cd-menu__icon" />
                  <span className="cd-menu__label">{s.label}</span>
                  <PlateStar />
                </a>
              ))}
            </nav>
            <div className="cd-side__end">
              <a href="/" className="nv-plate nv-plate--bar cd-menu__item">
                <Icon name="home" className="cd-menu__icon" />
                <span className="cd-menu__label">Open the website</span>
                <PlateStar />
              </a>
              <button type="button" className="nv-plate nv-plate--bar cd-menu__item is-out" onClick={() => api.signOut()}>
                <Icon name="logout" className="cd-menu__icon" />
                <span className="cd-menu__label">Log out</span>
                <PlateStar />
              </button>
            </div>
          </aside>
          <button type="button" className={`cd-scrim ${drawer ? 'is-open' : ''}`} aria-label="Close menu" tabIndex={drawer ? 0 : -1} onClick={() => setDrawer(false)} />
          <div className="cd-body adm-body">
            <div className="cd-mobilebar">
              <button type="button" className="cd-menubtn" onClick={() => setDrawer(true)} aria-expanded={drawer} aria-controls="adm-side">
                <Icon name="menu" /> Menu
              </button>
              <span className="cd-mobilebar__title">
                <Icon name={current.icon} /> {current.label}
              </span>
            </div>
            <main className="cd-main adm-main" key={current.key}>
              <div className="adm-bar-top">
                <p className="adm-stamp">
                  {loading ? 'Loading the latest data…' : data ? `Data as of ${data.loadedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </p>
                <button type="button" className="cd-btn cd-btn--sm" onClick={refresh} disabled={loading}>
                  <Icon name="refresh" className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
              {loadError && (
                <div className="cd-notice" role="alert">
                  <Icon name="alert" className="cd-notice__icon" />
                  <p>{loadError}</p>
                </div>
              )}
              {!data ? (
                <p className="cd-gate__loading">{loading ? 'Loading…' : ''}</p>
              ) : (
                <>
                  {current.key === 'overview' && <Overview {...ctx} />}
                  {current.key === 'events' && <EventsView {...ctx} />}
                  {current.key === 'departments' && <DepartmentsView {...ctx} />}
                  {current.key === 'participants' && <PeopleView {...ctx} />}
                  {current.key === 'teams' && <TeamsView {...ctx} />}
                  {current.key === 'announcements' && <AnnouncementsView {...ctx} />}
                  {current.key === 'controls' && isSuper && <ControlsView {...ctx} />}
                  {current.key === 'admins' && isSuper && <AdminsView {...ctx} />}
                  {current.key === 'activity' && isSuper && <ActivityView {...ctx} />}
                </>
              )}
            </main>
          </div>
        </>
      )}
      {toast && (
        <p className={`cd-toast ${toast.bad ? 'adm-toast--bad' : ''}`} role="status">
          <Icon name={toast.bad ? 'alert' : 'check'} className="h-4 w-4" /> {toast.text}
        </p>
      )}
    </div>
  );
}
