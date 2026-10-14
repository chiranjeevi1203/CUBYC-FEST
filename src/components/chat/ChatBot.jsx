import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import Freighter from './Freighter';
import { DroidHead } from './Droid';
import Frame from '../ui/Frame';
import { createBrain, SUGGESTIONS } from '../../lib/chatBrain';
import { chirp } from '../../lib/droidVoice';
import { navigate } from '../../lib/deptRoute';
import { prefersReducedMotion } from '../../config/experience';
import { useExperience } from '../../store/useExperience';

/*
 * CUBYC Comms — the site-wide chatbot.
 *
 * A freighter floats in the bottom-right corner of every page. Clicking it fires
 * a laser volley; where it lands, a blue hologram powers on over the page itself
 * (the site stays visible behind it). CB-27, the astromech in the header, chirps
 * along with the conversation and opens a navigation strip when tapped.
 *
 * Answers come from the built-in brain (lib/chatBrain.js — instant, offline).
 * Questions it can't answer go to /api/chat (Claude) when that function is
 * deployed with a key; otherwise the brain's fallback is shown.
 */

const API = import.meta.env.VITE_CHAT_API || '/api/chat';
const STORE_KEY = 'cubyc-comms';
const NAV = [
  { label: 'Home', href: '#home', icon: 'M3 10 10 4l7 6v7h-5v-4H8v4H3Z' },
  { label: 'Events', href: '#/events', icon: 'M4 4h12v12H4Z M4 8h12 M8 4v12' },
  { label: 'Schedule', href: '#/schedule', icon: 'M4 5h12v11H4Z M4 9h12 M7 3v4 M13 3v4' },
  { label: 'Gallery', href: '#/gallery', icon: 'M3 5h14v10H3Z M6 12l3-3 3 3 2-2 3 3' },
  { label: 'Rules', href: '#/rules', icon: 'M6 3h8v14H6Z M8 7h4 M8 10h4 M8 13h3' },
  { label: 'Departments', href: '#cosmos', icon: 'M10 10m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M4 10h12' },
];
const SOUND_KEY = 'cubyc-comms-sound';

const WELCOME = {
  role: 'bot',
  text: "Comms channel open. I'm **CUBYC Comms** — ask me anything about the fest: events, rules, the schedule, registration, or anything else on your mind.",
  chips: SUGGESTIONS,
};

/** **bold**, _italic_, and "• " bullet lines. */
function Rich({ text }) {
  const inline = (s, k) =>
    s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={`${k}-${i}`}>{part.slice(2, -2)}</strong>
      ) : part.startsWith('_') && part.endsWith('_') && part.length > 2 ? (
        <em key={`${k}-${i}`}>{part.slice(1, -1)}</em>
      ) : (
        <Fragment key={`${k}-${i}`}>{part}</Fragment>
      ),
    );
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((line, i) =>
      line.startsWith('• ') ? (
        <p key={i} className="comms-line comms-line--bullet" style={{ '--i': i }}>
          <span className="comms-bullet" aria-hidden="true" />
          <span>{inline(line.slice(2), i)}</span>
        </p>
      ) : (
        <p key={i} className="comms-line" style={{ '--i': i }}>
          {inline(line, i)}
        </p>
      ),
    );
}

function Message({ m, onLink, onChip, last }) {
  if (m.role === 'user') {
    return (
      <div className="comms-msg comms-msg--user">
        <p>{m.text}</p>
      </div>
    );
  }
  return (
    <div className="comms-msg comms-msg--bot">
      <span className="comms-avatar" aria-hidden="true">
        <DroidHead />
      </span>
      <div className="min-w-0 flex-1">
        <div className="comms-bubble">
          <Rich text={m.text} />
          {m.ai && <span className="comms-tag">AI</span>}
        </div>
        {m.links?.length > 0 && (
          <div className="comms-links">
            {m.links.map((l) => (
              <button key={l.label} type="button" className="comms-link" onClick={() => onLink(l)}>
                {l.label} <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        )}
        {last && m.chips?.length > 0 && (
          <div className="comms-chips">
            {m.chips.map((c) => (
              <button key={c} type="button" className="comms-chip" onClick={() => onChip(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatBot() {
  const hudMounted = useExperience((s) => s.hudMounted);
  const dept = useExperience((s) => s.dept);
  const deptView = useExperience((s) => s.deptView);
  const rulesOpen = useExperience((s) => s.rulesOpen);
  const setChatOpen = useExperience((s) => s.setChatOpen);
  const reduced = prefersReducedMotion();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {
      /* storage unavailable */
    }
    return [WELCOME];
  });

  const [navOpen, setNavOpen] = useState(false);
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const beep = useCallback((kind) => soundRef.current && !reduced && chirp(kind), [reduced]);
  const brain = useMemo(createBrain, []);
  const aiState = useRef('unknown'); // 'unknown' | 'on' | 'off'
  const launcherRef = useRef(null);
  const fxRef = useRef(null);
  const roomRef = useRef(null);
  const holoRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Remember the conversation for this visit.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* storage unavailable */
    }
  }, [messages]);

  /* ---------------- open / close ---------------- */
  const openChat = () => {
    if (open || busy) return;
    setBusy(true);
    setOpen(true);
    setChatOpen(true);
  };

  // Laser volley → the hologram powers on where it lands, over the page.
  useLayoutEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('chat-open');
    const room = roomRef.current;
    const holo = holoRef.current;
    const fx = fxRef.current;
    const ship = launcherRef.current?.getBoundingClientRect();
    const sx = ship ? ship.left + ship.width * 0.5 : window.innerWidth - 60;
    const sy = ship ? ship.top + ship.height * 0.45 : window.innerHeight - 60;
    const panel = holo?.getBoundingClientRect();
    const tx = panel ? panel.left + panel.width / 2 : window.innerWidth / 2;
    const ty = panel ? panel.top + panel.height / 2 : window.innerHeight / 2;
    const ang = (Math.atan2(ty - sy, tx - sx) * 180) / Math.PI;
    const bolts = fx ? Array.from(fx.querySelectorAll('.comms-laser')) : [];
    const burst = fx?.querySelector('.comms-burst');
    const lines = holo ? Array.from(holo.querySelectorAll('[data-holo-line]')) : [];

    gsap.set(room, { autoAlpha: 0 });
    gsap.set(holo, { autoAlpha: 0 });
    gsap.set(fx, { autoAlpha: 1 });
    bolts.forEach((b, i) => gsap.set(b, { left: sx, top: sy + (i - 1) * 6, rotate: ang, x: 0, y: 0, scaleX: 0.2, opacity: 0 }));
    if (burst) gsap.set(burst, { left: tx, top: ty, scale: 0, opacity: 0 });

    const tl = gsap.timeline({ onComplete: () => setBusy(false) });
    if (!reduced) {
      tl.to(launcherRef.current, { rotate: -8, scale: 1.08, duration: 0.18, ease: 'power2.out' }, 0);
      bolts.forEach((b, i) => {
        tl.to(b, { opacity: 1, scaleX: 1, duration: 0.06 }, 0.08 + i * 0.09).to(
          b,
          // Fly along the aim line (x and y — a rotated element's x stays horizontal).
          { x: tx - sx - Math.cos((ang * Math.PI) / 180) * 70, y: ty - sy - Math.sin((ang * Math.PI) / 180) * 70, duration: 0.32, ease: 'power1.in' },
          0.08 + i * 0.09,
        ).to(b, { opacity: 0, duration: 0.05 }, 0.38 + i * 0.09);
      });
      tl.to(launcherRef.current, { rotate: 0, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 0.3)
        .to(burst, { opacity: 1, scale: 1, duration: 0.18, ease: 'power2.out' }, 0.42)
        .to(burst, { opacity: 0, scale: 2.6, duration: 0.5, ease: 'power2.out' }, 0.6);
    }
    tl.set(room, { autoAlpha: 1 }, reduced ? 0 : 0.5)
      .call(() => beep('hello'), null, '<')
      .fromTo(holo, { autoAlpha: 1, scaleX: 0, scaleY: 0.01, filter: 'brightness(2.2)' }, { scaleX: 1, duration: reduced ? 0.01 : 0.22, ease: 'power2.out' }, '<')
      .to(holo, { scaleY: 1, duration: reduced ? 0.01 : 0.55, ease: 'expo.out' })
      .to(holo, { filter: 'brightness(1)', duration: reduced ? 0.01 : 0.5, clearProps: 'filter,transform' }, '<0.1')
      .fromTo(lines, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.04, clearProps: 'opacity,visibility,transform' }, '<')
      .set(fx, { autoAlpha: 0 })
      .call(() => inputRef.current?.focus({ preventScroll: true }));
    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const closeChat = useCallback(
    (after) => {
      if (!open) return;
      setBusy(true);
      const holo = holoRef.current;
      const finish = () => {
        setOpen(false);
        setBusy(false);
        setChatOpen(false);
        document.documentElement.classList.remove('chat-open');
        launcherRef.current?.focus({ preventScroll: true });
        after?.();
      };
      if (reduced) return finish();
      gsap
        .timeline({ onComplete: finish })
        .to(holo, { filter: 'brightness(1.9)', duration: 0.07 })
        .to(holo, { scaleY: 0.01, duration: 0.2, ease: 'power3.in' })
        .to(holo, { scaleX: 0, autoAlpha: 0, duration: 0.13, ease: 'power2.in' });
      return undefined;
    },
    [open, reduced, setChatOpen],
  );

  // While open: Esc closes; other keys stay with the chat (pages' shortcuts don't fire).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeChat();
      }
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, closeChat]);

  const toggleSound = () => {
    setSound((v) => {
      try {
        localStorage.setItem(SOUND_KEY, v ? 'off' : 'on');
      } catch {
        /* storage unavailable */
      }
      return !v;
    });
  };
  const toggleNav = () => {
    setNavOpen((v) => !v);
    beep(navOpen ? 'click' : 'nav');
  };

  /* ---------------- conversation ---------------- */
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [messages, thinking, open, reduced]);

  const askAI = async (history) => {
    if (aiState.current === 'off') return null;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.slice(-10).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        }),
        signal: controller.signal,
      });
      const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
      if (!isJson || res.status === 404 || res.status === 503) {
        aiState.current = 'off'; // no AI function deployed here
        return null;
      }
      const data = await res.json();
      if (!res.ok || !data.reply) return null;
      aiState.current = 'on';
      return data.reply;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  };

  const send = async (raw) => {
    const text = raw.trim().slice(0, 600);
    if (!text || thinking) return;
    setInput('');
    const history = [...messages, { role: 'user', text }];
    setMessages(history);
    setThinking(true);
    setNavOpen(false);
    beep('think');
    const local = brain.reply(text);
    // A short "transmission" beat even for instant answers.
    const minDelay = new Promise((r) => window.setTimeout(r, reduced ? 0 : 450 + Math.min(text.length * 6, 400)));
    let answer = { role: 'bot', text: local.text, links: local.links, chips: local.chips };
    if (!local.confident) {
      const ai = await askAI(history);
      if (ai) answer = { role: 'bot', text: ai, ai: true, links: [], chips: [] };
    }
    await minDelay;
    setThinking(false);
    setMessages((m) => [...m, answer]);
    beep('reply');
  };

  const followLink = (l) => {
    beep('nav');
    setNavOpen(false);
    if (l.href?.startsWith('http')) {
      window.open(l.href, '_blank', 'noopener');
      return;
    }
    closeChat(() => {
      const s = useExperience.getState();
      if (l.dept) {
        // Leave any full-screen page first, then fly to the department / event.
        s.setGalleryOpen(false);
        s.setScheduleOpen(false);
        s.setRulesOpen(false);
        s.setEventsOpen(false);
        navigate({ dept: l.dept, view: l.event ? 'events' : 'orbit', event: l.event ?? null });
      } else if (l.href) {
        window.location.hash = l.href;
      }
    });
  };

  const clear = () => {
    setMessages([WELCOME]);
    brain.context.event = null;
    brain.context.dept = null;
  };

  // Lift the launcher above controls that sit in the bottom-right on some pages.
  const lift = rulesOpen ? 'rules' : dept ? (deptView === 'events' ? 'deck' : 'dept') : 'none';

  if (hudMounted) return null;

  return (
    <>
      {/* Launcher */}
      <button
        ref={launcherRef}
        type="button"
        className={`comms-launcher ${open ? 'is-hidden' : ''}`}
        data-lift={lift}
        onClick={openChat}
        aria-label="Open CUBYC Comms — ask a question"
        aria-haspopup="dialog"
        data-no-orbit
      >
        <span className="comms-launcher__ping" aria-hidden="true" />
        <Freighter className="comms-launcher__ship" />
        <span className="comms-launcher__label">Ask CUBYC</span>
      </button>

      {/* Laser volley */}
      <div ref={fxRef} className="comms-fx" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="comms-laser" />
        ))}
        <span className="comms-burst" />
      </div>

      {/* The chat hologram, over the page */}
      {open && (
        <div
          ref={roomRef}
          className="comms-room"
          role="dialog"
          aria-modal="true"
          aria-label="CUBYC Comms chat"
          data-no-orbit
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) closeChat();
          }}
        >
          <section ref={holoRef} className="holo-screen comms-holo">
            <Frame size="lg" className="holo-frame" />
            <header className="comms-head" data-holo-line>
              <button type="button" className="comms-head__droid" onClick={toggleNav} aria-label="Open navigation" aria-expanded={navOpen}>
                <DroidHead />
              </button>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-display text-[0.86rem] font-bold tracking-[0.18em] text-[#f6f1e7] uppercase">
                  CUBYC Comms
                  <span className="comms-led" aria-hidden="true" />
                </span>
                <span className="block truncate font-mono text-[0.54rem] tracking-[0.28em] text-gold-200/60 uppercase">
                  CB-27 online · {thinking ? 'Receiving…' : 'Ask anything'}
                </span>
              </span>
              <button type="button" className="comms-icon" onClick={toggleSound} aria-label={sound ? 'Mute droid sounds' : 'Unmute droid sounds'} aria-pressed={!sound} title={sound ? 'Sound on' : 'Sound off'}>
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path d="M3 8h3l4-3v10l-4-3H3Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  {sound ? (
                    <path d="M13 7.5a3.5 3.5 0 0 1 0 5M15 5.5a6.5 6.5 0 0 1 0 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  ) : (
                    <path d="m13 8 4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  )}
                </svg>
              </button>
              <button type="button" className="comms-icon" onClick={clear} aria-label="Clear conversation" title="Clear conversation">
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className="comms-icon" onClick={() => closeChat()} aria-label="Close chat">
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div ref={listRef} className="comms-list" aria-live="polite" data-holo-line>
              {messages.map((m, i) => (
                <Message key={i} m={m} last={i === messages.length - 1 && !thinking} onLink={followLink} onChip={send} />
              ))}
              {thinking && (
                <div className="comms-msg comms-msg--bot">
                  <span className="comms-avatar" aria-hidden="true">
                    <DroidHead />
                  </span>
                  <div className="comms-bubble comms-typing" role="status">
                    <span className="sr-only">CUBYC Comms is typing</span>
                    <i />
                    <i />
                    <i />
                    <span className="ml-2 font-mono text-[0.55rem] tracking-[0.28em] uppercase opacity-70">Transmitting</span>
                  </div>
                </div>
              )}
            </div>

            {navOpen && (
              <nav className="comms-nav comms-nav--inline" aria-label="Site navigation">
                <ul>
                  {NAV.map((n) => (
                    <li key={n.label}>
                      <button type="button" onClick={() => followLink(n)}>
                        {n.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <form
              className="comms-input"
              data-holo-line
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about events, rules, schedule…"
                aria-label="Your message"
                maxLength={600}
                autoComplete="off"
                enterKeyHint="send"
              />
              <button type="submit" className="comms-send" disabled={!input.trim() || thinking} aria-label="Send">
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path d="M3 10 17 3l-4 14-3-6-7-1Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
