import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import SiteNav from '../ui/SiteNav';
import Frame from '../ui/Frame';
import Star from '../ui/Star';
import { RULE_COUNT, RULE_SECTIONS } from '../../config/rules';
import { BRAND, prefersReducedMotion } from '../../config/experience';
import { createShaderLayer } from '../../lib/blackHole';
import { SPACE_FRAG } from '../../lib/spaceView';
import { useExperience } from '../../store/useExperience';

/*
 * The bridge of a spacecraft. Through the window, galaxies and streaming stars
 * (the craft keeps flying — the throttle sets the pace). In front, a console:
 * three live screens, toggle switches that change the view (nav lights, shields,
 * autopilot) and the main button. Pressing it powers the screens down and
 * projects the rules on a gold hologram, which is the only thing that scrolls.
 */

const pad = (n) => String(n).padStart(2, '0');
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** 'text with **key phrases**' → text + highlighted marks */
function Highlighted({ text }) {
  return text.split('**').map((part, i) =>
    i % 2 ? (
      <mark key={i} className="rule-hi">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** The cockpit around the window: canopy, struts, pillars and the dash top. */
function Cockpit({ navOn }) {
  return (
    <svg className="bridge-frame" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="bridge-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0d0f1c" />
          <stop offset="0.5" stopColor="#06070e" />
          <stop offset="1" stopColor="#0b0d18" />
        </linearGradient>
        <linearGradient id="bridge-dash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10121f" />
          <stop offset="1" stopColor="#030409" />
        </linearGradient>
      </defs>
      {/* Canopy */}
      <path d="M0 0 H1600 V58 L1190 92 L800 104 L410 92 L0 58 Z" fill="url(#bridge-metal)" />
      {/* Upper struts */}
      <path d="M410 92 L428 92 L292 470 L270 470 Z" fill="url(#bridge-metal)" />
      <path d="M1190 92 L1172 92 L1308 470 L1330 470 Z" fill="url(#bridge-metal)" />
      {/* Side pillars */}
      <path d="M0 58 L120 72 L290 560 L250 900 H0 Z" fill="url(#bridge-metal)" />
      <path d="M1600 58 L1480 72 L1310 560 L1350 900 H1600 Z" fill="url(#bridge-metal)" />
      {/* Dash top */}
      <path d="M0 620 C420 572 1180 572 1600 620 V900 H0 Z" fill="url(#bridge-dash)" />
      {/* Gold edge light along the window frame */}
      <g fill="none" stroke="rgba(233,194,122,0.28)" strokeWidth="1.2">
        <path d="M120 72 L410 94 L800 106 L1190 94 L1480 72" />
        <path d="M120 72 L290 560" />
        <path d="M1480 72 L1310 560" />
        <path d="M428 92 L292 470 M1172 92 L1308 470" strokeOpacity="0.6" />
        <path d="M0 620 C420 572 1180 572 1600 620" stroke="rgba(233,194,122,0.42)" />
      </g>
      {/* Panel seams + rivets */}
      <g stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none">
        <path d="M40 140 L190 160 M60 300 L230 330 M70 460 L270 500 M1560 140 L1410 160 M1540 300 L1370 330 M1530 460 L1330 500" />
        <path d="M200 0 L230 66 M600 0 L605 98 M1000 0 L995 98 M1400 0 L1370 66" />
      </g>
      <g fill="rgba(233,194,122,0.3)">
        {[[150, 120], [205, 280], [258, 440], [1450, 120], [1395, 280], [1342, 440], [520, 70], [1080, 70]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" />
        ))}
      </g>
      {/* Navigation lights: port (red) and starboard (green) */}
      <circle cx="196" cy="110" r="4" className={`bridge-nav bridge-nav--port ${navOn ? 'is-on' : ''}`} />
      <circle cx="1404" cy="110" r="4" className={`bridge-nav bridge-nav--star ${navOn ? 'is-on' : ''}`} />
    </svg>
  );
}

function Toggle({ label, on, onChange }) {
  return (
    <button type="button" className={`bridge-toggle ${on ? 'is-on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on}>
      <span className="bridge-toggle__track">
        <span className="bridge-toggle__knob" />
      </span>
      <span className="bridge-toggle__label">{label}</span>
    </button>
  );
}

function RulesView({ open, onGone }) {
  const quality = useExperience((s) => s.quality);
  const setCovered = useExperience((s) => s.setDeptCovered);
  const reduced = prefersReducedMotion();

  const [holo, setHolo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [navOn, setNavOn] = useState(true);
  const [shields, setShields] = useState(false);
  const [autopilot, setAutopilot] = useState(true);
  const [throttle, setThrottle] = useState(0.45);
  const [section, setSection] = useState(RULE_SECTIONS[0].key);

  const rootRef = useRef(null);
  const bgRef = useRef(null);
  const headRef = useRef(null);
  const screensRef = useRef(null);
  const beamRef = useRef(null);
  const holoRef = useRef(null);
  const scrollRef = useRef(null);
  const closing = useRef(false);
  const state = useRef({ travel: 0, time: 0, intro: 0, shield: 0, look: { x: 0, y: 0 }, pointer: { x: 0, y: 0 }, throttle: 0.45, speed: 0.45 });
  state.current.throttle = throttle;
  state.current.shieldOn = shields;
  state.current.autopilot = autopilot;
  // The rules hologram opens on its own once the bridge is up (openHolo is defined below).
  const openRef = useRef(null);

  /* ---------- enter / exit ---------- */
  useLayoutEffect(() => {
    const root = rootRef.current;
    document.documentElement.classList.add('dept-open');
    const head = headRef.current ? Array.from(headRef.current.children) : [];
    const screens = screensRef.current ? Array.from(screensRef.current.children) : [];
    gsap.set(root, { autoAlpha: 0 });
    gsap.set(head, { autoAlpha: 0, y: 18 });
    gsap.set(screens, { autoAlpha: 0, y: 30 });
    gsap.set(holoRef.current, { autoAlpha: 0 });
    gsap.set(beamRef.current, { autoAlpha: 0, scaleY: 0 });
    const tl = gsap
      .timeline()
      .to(root, { autoAlpha: 1, duration: reduced ? 0.2 : 0.7, ease: 'power2.out', onComplete: () => setCovered(true) })
      .to(state.current, { intro: 1, duration: reduced ? 0.2 : 1.6, ease: 'power2.out' }, 0.1)
      // Rules are shown by default: the hologram unfolds straight away. The heading and
      // console screens stay hidden until the visitor closes it (closeHolo boots them up).
      .set(headRef.current, { autoAlpha: 0 }, 0.45)
      .set(head, { autoAlpha: 1, y: 0 }, 0.45)
      .set(screens, { clearProps: 'transform' }, 0.45)
      .call(() => openRef.current?.(), null, reduced ? 0.2 : 0.5);
    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      if (!closing.current) return undefined;
      closing.current = false;
      document.documentElement.classList.add('dept-open');
      const tl = gsap.timeline().to(rootRef.current, { autoAlpha: 1, duration: 0.4, onComplete: () => setCovered(true) });
      return () => tl.kill();
    }
    closing.current = true;
    setCovered(false);
    document.documentElement.classList.remove('dept-open');
    const tl = gsap
      .timeline({ onComplete: onGone })
      .to(state.current, { intro: 0, duration: 0.6, ease: 'power2.in' }, 0)
      .to(rootRef.current, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, 0.1);
    return () => tl.kill();
  }, [open, onGone, setCovered]);

  useEffect(() => () => document.documentElement.classList.remove('dept-open'), []);

  /* ---------- the view out of the window ---------- */
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 0.75 : 1);
    const bg = createShaderLayer(bgRef.current, SPACE_FRAG);
    const resize = () => bg?.resize(window.innerWidth, window.innerHeight, dpr);
    resize();
    window.addEventListener('resize', resize);
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = clamp((now - last) / 1000, 0, 0.1);
      last = now;
      const s = state.current;
      const k = 1 - Math.exp(-dt * 2.5);
      s.time += dt;
      s.speed += (s.throttle - s.speed) * k;
      s.travel += dt * (reduced ? 0.6 : 2 + s.speed * 22);
      s.shield += ((s.shieldOn ? 1 : 0) - s.shield) * k;
      // Autopilot drifts the heading gently; otherwise the view follows the pointer.
      const tx = s.autopilot ? Math.sin(s.time * 0.21) * 0.6 + s.pointer.x * 0.4 : s.pointer.x;
      const ty = s.autopilot ? Math.sin(s.time * 0.17 + 1) * 0.35 + s.pointer.y * 0.3 : s.pointer.y;
      s.look.x += (tx - s.look.x) * k;
      s.look.y += (ty - s.look.y) * k;
      bg?.draw({
        uRes: [window.innerWidth * dpr, window.innerHeight * dpr],
        uTime: s.time,
        uTravel: s.travel,
        uLook: [s.look.x, s.look.y],
        uIntro: s.intro,
        uShield: s.shield,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onMove = (e) => {
      state.current.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      state.current.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      bg?.destroy();
    };
  }, [quality, reduced]);

  /* ---------- hologram on / off ---------- */
  const openHolo = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setHolo(true);
    const screens = Array.from(screensRef.current.children);
    const el = holoRef.current;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const lines = Array.from(el.querySelectorAll('[data-holo-line]')).slice(0, 14);
    const d = reduced ? 0.01 : 1;
    gsap
      .timeline({ onComplete: () => setBusy(false) })
      // Screens power down: flicker, collapse to a line, gone.
      .to(screens, { opacity: 0.35, duration: 0.05 * d, repeat: 3, yoyo: true, ease: 'none', stagger: 0.04 })
      .to(screens, { scaleY: 0.01, filter: 'brightness(2)', duration: 0.22 * d, ease: 'power3.in', stagger: 0.05 })
      .to(screens, { scaleX: 0, autoAlpha: 0, duration: 0.14 * d, ease: 'power2.in', stagger: 0.05 })
      .to(headRef.current, { autoAlpha: 0, y: -10, duration: 0.4 * d }, 0)
      // Projector beam, then the hologram unfolds.
      .fromTo(beamRef.current, { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: 0.5 * d, ease: 'power2.out' }, '-=0.05')
      .fromTo(el, { autoAlpha: 1, scaleX: 0, scaleY: 0.01, filter: 'brightness(2.2)' }, { scaleX: 1, duration: 0.22 * d, ease: 'power2.out' }, '-=0.15')
      .to(el, { scaleY: 1, duration: 0.6 * d, ease: 'expo.out' })
      .to(el, { keyframes: { opacity: [1, 0.55, 1, 0.8, 1] }, duration: 0.32 * d, ease: 'none' }, '<')
      .to(el, { filter: 'brightness(1)', duration: 0.6 * d, ease: 'power2.out', clearProps: 'filter' }, '<0.1')
      .fromTo(lines, { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.45 * d, stagger: 0.035 * d, ease: 'power2.out', clearProps: 'opacity,visibility,transform' }, '<0.05')
      .to(beamRef.current, { opacity: 0.45, duration: 1 * d }, '<');
  }, [busy, reduced]);

  const closeHolo = useCallback(() => {
    if (busy) return;
    setBusy(true);
    const screens = Array.from(screensRef.current.children);
    const el = holoRef.current;
    const d = reduced ? 0.01 : 1;
    gsap
      .timeline({
        onComplete: () => {
          setHolo(false);
          setBusy(false);
        },
      })
      .to(el, { filter: 'brightness(1.9)', duration: 0.07 * d })
      .to(el, { scaleY: 0.01, duration: 0.22 * d, ease: 'power3.in' })
      .to(el, { scaleX: 0, autoAlpha: 0, duration: 0.14 * d, ease: 'power2.in', clearProps: 'filter' })
      .to(beamRef.current, { autoAlpha: 0, scaleY: 0, duration: 0.35 * d, ease: 'power2.in' }, '-=0.1')
      // Screens boot back up.
      .fromTo(screens, { autoAlpha: 1, scaleX: 0, scaleY: 0.01, filter: 'brightness(2)' }, { scaleX: 1, duration: 0.2 * d, stagger: 0.06, ease: 'power2.out' })
      .to(screens, { scaleY: 1, duration: 0.5 * d, stagger: 0.06, ease: 'expo.out' })
      .to(screens, { filter: 'brightness(1)', duration: 0.5 * d, stagger: 0.06, clearProps: 'filter,transform' }, '<0.1')
      .to(headRef.current, { autoAlpha: 1, y: 0, duration: 0.6 * d }, '<');
  }, [busy, reduced]);

  openRef.current = openHolo;

  /* ---------- keyboard, section tabs ---------- */
  const leave = () => {
    window.location.hash = '#rules';
  };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (holo) closeHolo();
      else leave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [holo, closeHolo]);

  const jumpTo = (key) => {
    const box = scrollRef.current;
    const target = box?.querySelector(`[data-section="${key}"]`);
    if (!box || !target) return;
    box.scrollTo({ top: target.offsetTop - 70, behavior: reduced ? 'auto' : 'smooth' });
  };
  const onHoloScroll = () => {
    const box = scrollRef.current;
    if (!box) return;
    let current = RULE_SECTIONS[0].key;
    box.querySelectorAll('[data-section]').forEach((s) => {
      if (s.offsetTop - 90 <= box.scrollTop) current = s.dataset.section;
    });
    if (current !== section) {
      setSection(current);
      // Keep the active tab in view (the tab row scrolls sideways on phones).
      box.parentElement?.querySelector(`.bridge-tab[data-key="${current}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  };

  let n = 0;
  const velocity = Math.round(4 + throttle * 26);

  return (
    <div ref={rootRef} className={`bridge fixed inset-0 z-40 overflow-hidden text-[#f4f1ea] ${holo ? 'is-holo' : ''}`}>
      <canvas ref={bgRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className={`bridge-shield pointer-events-none absolute inset-0 ${shields ? 'is-on' : ''}`} aria-hidden="true" />
      <Cockpit navOn={navOn} />

      <SiteNav active="rules" />

      {/* Heading on the canopy */}
      <header ref={headRef} className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+5.25rem)] z-20 flex flex-col items-center px-5 text-center sm:top-28">
        <p className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
          <Star className="h-2 w-2 text-gold-400/70" />
          Mission protocol · {BRAND.fest}
          <Star className="h-2 w-2 text-gold-400/70" />
        </p>
        <h1 className="title-cosmic mt-3 font-display text-[clamp(2.2rem,6.6vw,4.6rem)] font-bold leading-none tracking-[0.12em] [margin-right:-0.12em] uppercase">Rules</h1>
        <p className="mt-3 max-w-md text-[0.86rem] leading-relaxed text-white/60">Every crew follows the same protocol. Engage it from the console below.</p>
      </header>

      {/* ---------------- Console ---------------- */}
      <div className="bridge-console">
        <div ref={screensRef} className="bridge-screens">
          {/* Systems */}
          <div className="bridge-slot bridge-slot--left">
          <section className="bridge-screen bridge-screen--left" aria-label="Systems">
            <p className="bridge-screen__title">
              <span className="holo-led" /> Systems
            </p>
            {[
              ['Hull integrity', 98],
              ['Core power', Math.round(62 + throttle * 34)],
              ['Shields', shields ? 100 : 12],
              ['Life support', 96],
            ].map(([label, v]) => (
              <div key={label} className="bridge-meter">
                <span className="flex justify-between">
                  <span>{label}</span>
                  <span className="text-gold-200">{v}%</span>
                </span>
                <span className="bridge-meter__bar">
                  <span style={{ transform: `scaleX(${v / 100})` }} />
                </span>
              </div>
            ))}
          </section>
          </div>
          {/* Navigation radar */}
          <div className="bridge-slot bridge-slot--center">
          <section className="bridge-screen bridge-screen--center" aria-label="Navigation">
            <p className="bridge-screen__title">
              <span className="holo-led" /> Navigation
              <span className="ml-auto text-white/45">{autopilot ? 'Autopilot' : 'Manual'}</span>
            </p>
            <div className="bridge-radar">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="56" className="bridge-radar__ring" />
                <circle cx="60" cy="60" r="38" className="bridge-radar__ring" />
                <circle cx="60" cy="60" r="20" className="bridge-radar__ring" />
                <path d="M60 4 V116 M4 60 H116" className="bridge-radar__ring" />
                <g className="bridge-radar__sweep">
                  <path d="M60 60 L60 4 A56 56 0 0 1 104 26 Z" fill="url(#radar-sweep)" />
                </g>
                <defs>
                  <linearGradient id="radar-sweep" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#e9c27a" stopOpacity="0" />
                    <stop offset="1" stopColor="#e9c27a" stopOpacity="0.55" />
                  </linearGradient>
                </defs>
                {[[78, 34], [36, 72], [88, 82], [50, 28]].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="2.2" className="bridge-radar__blip" style={{ animationDelay: `${i * 0.7}s` }} />
                ))}
              </svg>
            </div>
            <p className="bridge-readout">
              <span>
                HDG <b>042°</b>
              </span>
              <span>
                VEL <b>{velocity} km/s</b>
              </span>
            </p>
          </section>
          </div>
          {/* Telemetry */}
          <div className="bridge-slot bridge-slot--right">
          <section className="bridge-screen bridge-screen--right" aria-label="Telemetry">
            <p className="bridge-screen__title">
              <span className="holo-led" /> Telemetry
            </p>
            <div className="bridge-graph">
              <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
                <path
                  className="bridge-graph__line"
                  d="M0 40 L10 34 L20 38 L30 22 L40 30 L50 18 L60 28 L70 24 L80 36 L90 20 L100 40 L110 34 L120 38 L130 22 L140 30 L150 18 L160 28 L170 24 L180 36 L190 20 L200 40 L210 34 L220 38 L230 22 L240 30 L250 18 L260 28 L270 24 L280 36 L290 20 L300 40 L310 34 L320 38 L330 22 L340 30 L350 18 L360 28 L370 24 L380 36 L390 20 L400 40"
                />
              </svg>
            </div>
            <dl className="bridge-stats">
              <div>
                <dt>Rules</dt>
                <dd>{pad(RULE_COUNT)}</dd>
              </div>
              <div>
                <dt>Sections</dt>
                <dd>{pad(RULE_SECTIONS.length)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{holo ? 'Live' : 'Ready'}</dd>
              </div>
            </dl>
          </section>
          </div>
        </div>

        {/* Control strip */}
        <div className="bridge-controls">
          <Frame size="sm" star={false} />
          <div className="bridge-controls__group">
            <Toggle label="Nav lights" on={navOn} onChange={setNavOn} />
            <Toggle label="Shields" on={shields} onChange={setShields} />
            <Toggle label="Autopilot" on={autopilot} onChange={setAutopilot} />
          </div>
          <button type="button" className={`bridge-engage ${holo ? 'is-live' : ''}`} onClick={holo ? closeHolo : openHolo} disabled={busy}>
            {!holo && <span className="bridge-engage__ring" aria-hidden="true" />}
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d="M10 2v7M5.6 5.2a6.5 6.5 0 1 0 8.8 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {holo ? 'Close protocol' : 'Display protocol'}
          </button>
          <label className="bridge-throttle">
            <span className="flex justify-between">
              <span>Throttle</span>
              <span className="text-gold-200">{Math.round(throttle * 100)}%</span>
            </span>
            <input type="range" min="0" max="1" step="0.01" value={throttle} onChange={(e) => setThrottle(Number(e.target.value))} aria-label="Throttle" />
          </label>
        </div>
      </div>

      {/* ---------------- The hologram ---------------- */}
      <span ref={beamRef} className="bridge-beam" aria-hidden="true" />
      <article ref={holoRef} className="holo-screen bridge-holo" aria-hidden={!holo} inert={!holo}>
        <Frame size="lg" className="holo-frame" />
        <div className="holo-screen__hud" data-holo-line>
          <span className="inline-flex items-center gap-2.5">
            <span className="holo-led" aria-hidden="true" />
            Mission protocol · {pad(RULE_COUNT)} rules
          </span>
          <button type="button" className="bridge-holo__close" onClick={closeHolo} aria-label="Close the rules">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className="bridge-holo__tabs" aria-label="Rule sections" data-holo-line>
          {RULE_SECTIONS.map((s, i) => (
            <button key={s.key} data-key={s.key} type="button" className={`bridge-tab ${section === s.key ? 'is-on' : ''}`} onClick={() => jumpTo(s.key)}>
              <span className="opacity-60">{pad(i + 1)}</span> {s.title}
            </button>
          ))}
        </nav>
        <div ref={scrollRef} className="bridge-holo__scroll" onScroll={onHoloScroll} tabIndex={0} aria-label="Rules">
          {RULE_SECTIONS.map((s, si) => (
            <section key={s.key} data-section={s.key} className="bridge-section">
              <h2 className="bridge-section__title" data-holo-line>
                <span className="text-gold-300/70">{pad(si + 1)}</span> {s.title}
                <span className="bridge-section__rule" aria-hidden="true" />
              </h2>
              <ol>
                {s.rules.map((r) => {
                  n += 1;
                  return (
                    <li key={r} className="bridge-rule" data-holo-line>
                      <span className="bridge-rule__num">{pad(n)}</span>
                      <p>
                        <Highlighted text={r} />
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <p className="pb-2 pt-6 text-center font-mono text-[0.55rem] tracking-[0.3em] text-white/40 uppercase">
            Event-specific rules are on each domain&apos;s event pages
          </p>
        </div>
      </article>
    </div>
  );
}

/** The rules page (#/rules): mounted while open, plus its exit animation. */
export default function RulesPage() {
  const open = useExperience((s) => s.rulesOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  const onGone = useCallback(() => setMounted(false), []);
  if (!mounted) return null;
  return <RulesView open={open} onGone={onGone} />;
}
