import { useEffect, useRef, useState } from 'react';
import FestMark from './FestMark';
import Star from './Star';
import BrandLogo from '../hud/BrandLogo';
import Shuttle from '../schedule/Shuttle';
import { BRAND, SOCIAL } from '../../config/experience';

const USEFUL = [
  { label: 'FAQs', note: 'Ask CB-27', action: 'chat' },
  { label: 'Registration Process', href: '#contact' },
  { label: 'Participant’s Guidelines', href: '#/rules' },
];
const POLICIES = [
  { label: 'Terms & Conditions' },
  { label: 'Privacy Policy' },
  { label: 'Rules & Regulations', href: '#/rules' },
];
const EXPLORE = [
  { label: 'All Events', href: '#/events' },
  { label: 'Domains', href: '#cosmos' },
  { label: 'Gallery', href: '#/gallery' },
  { label: 'Schedule', href: '#/schedule' },
  { label: 'About & Dignitaries', href: '#/about' },
  { label: 'Sponsors', href: '#/sponsors' },
  { label: 'Contact & Map', href: '#/contact' },
];

const SOCIAL_ICONS = {
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="13" height="13" rx="3.6" />
      <circle cx="10" cy="10" r="3.1" />
      <circle cx="14" cy="6" r="0.6" fill="currentColor" />
    </>
  ),
  linkedin: (
    <>
      <path d="M5.5 8.5v7 M5.5 5.2v.1" />
      <path d="M9 15.5v-7 M9 11.6c0-2 1.3-3.2 3-3.2s3 1 3 3.2v3.9" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5" width="15" height="10" rx="3" />
      <path d="m8.6 7.8 3.6 2.2-3.6 2.2Z" fill="currentColor" />
    </>
  ),
};

/** A stylised auspicious cloud (xiangyun) in gold line — the footer's ornament. */
function Cloud({ className = '' }) {
  return (
    <svg viewBox="0 0 120 48" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 40h96" />
        <path d="M18 40c-8 0-11-9-4-13 5-3 10 1 9 5-1 3-5 3-6 1" />
        <path d="M30 40c-4-7 1-15 9-15 3-9 17-10 21-2 6-5 16-1 15 7 7-2 13 3 11 10" />
        <path d="M46 25c-4 1-5 6-2 8s7 0 6-3c-1-2-3-2-4-1" />
        <path d="M70 30c-3-3-8-1-8 3s5 5 7 2" />
        <path d="M86 40c3-6 12-7 16-2" />
      </g>
    </svg>
  );
}

/** The CUBYC orbital station: habitat ring, hub, docking port and gold-framed solar wings. */
function Station() {
  return (
    <svg viewBox="0 0 240 140" className="ft-station__svg" aria-hidden="true">
      <defs>
        <linearGradient id="ft-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d3a8a" />
          <stop offset="1" stopColor="#0c1a44" />
        </linearGradient>
        <linearGradient id="ft-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#d6dae3" />
          <stop offset="1" stopColor="#8d93a3" />
        </linearGradient>
        <linearGradient id="ft-glint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Truss */}
      <rect x="20" y="67" width="200" height="6" fill="#b8bdc9" />
      <path d="M20 67h200M20 73h200" stroke="#5c6272" strokeWidth="0.6" />
      {Array.from({ length: 20 }, (_, i) => (
        <path key={i} d={`M${24 + i * 10} 67l5 6m0-6-5 6`} stroke="#7a8090" strokeWidth="0.5" />
      ))}
      {/* Solar wings */}
      {[[22, 30], [22, 76], [178, 30], [178, 76]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="42" height="34" fill="url(#ft-panel)" stroke="#e9c27a" strokeWidth="1" />
          {[1, 2, 3].map((k) => (
            <path key={k} d={`M${x + k * 10.5} ${y}v34`} stroke="rgba(160,190,255,0.35)" strokeWidth="0.6" />
          ))}
          <path d={`M${x} ${y + 17}h42`} stroke="rgba(160,190,255,0.35)" strokeWidth="0.6" />
          <rect x={x} y={y} width="42" height="34" fill="url(#ft-glint)" className="ft-station__glint" />
        </g>
      ))}
      {/* Habitat ring */}
      <g className="ft-station__ring">
        <ellipse cx="120" cy="70" rx="38" ry="38" fill="none" stroke="#c9ced8" strokeWidth="5" />
        <ellipse cx="120" cy="70" rx="38" ry="38" fill="none" stroke="#7a8090" strokeWidth="5" strokeDasharray="3 9" />
        {[0, 90, 180, 270].map((a) => (
          <path key={a} d="M120 36v20" stroke="#9aa0ae" strokeWidth="2" transform={`rotate(${a} 120 70)`} />
        ))}
      </g>
      {/* Hub */}
      <circle cx="120" cy="70" r="16" fill="url(#ft-hull)" stroke="#5c6272" strokeWidth="1" />
      <circle cx="120" cy="70" r="7" fill="#0b0d16" stroke="#e9c27a" strokeWidth="1" />
      <circle cx="120" cy="70" r="2.5" fill="#f7e7c4" className="ft-station__core" />
      {/* Docking arm + port (left) */}
      <rect x="64" y="64" width="40" height="12" fill="url(#ft-hull)" stroke="#5c6272" strokeWidth="0.8" />
      <rect x="58" y="61" width="8" height="18" fill="#c9ced8" stroke="#5c6272" strokeWidth="0.8" />
      <circle cx="56" cy="70" r="3" className="ft-station__dock" />
      {/* Beacons */}
      <circle cx="120" cy="30" r="1.8" className="ft-beacon" />
      <circle cx="120" cy="110" r="1.8" className="ft-beacon ft-beacon--b" />
    </svg>
  );
}

/**
 * The site footer, laid over the site's own live background (a gradient shade
 * deepens it toward the bottom): a shuttle docks with the CUBYC station on a
 * dashed flight path, then the brand and socials (left) and the links (right),
 * a gold cloud ornament, and a bottom bar with the CHRIST mark and campus. A
 * giant blurred CUBYC wordmark sits behind it all. The scene follows the pointer
 * gently and only animates while on screen.
 */
const MAP_PLACE = 'CHRIST (Deemed to be University) Yeshwanthpur Campus, Bangalore';
const MAP_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(MAP_PLACE)}&z=16&output=embed`;
const MAP_DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(MAP_PLACE)}`;

/** The campus map band: the live map in night colours, a gold beacon and a venue plate. */
function FooterMap() {
  // The embed is heavy: start loading it about two screens before it scrolls into
  // view (measured inside whichever surface scrolls), so it is drawn by the time
  // it arrives and never stalls the scroll, and never loads for visitors who stop short.
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), {
      root: el.closest('.space-page'),
      rootMargin: '200% 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return (
    <section ref={ref} className="ft-map" aria-label="Campus map">
      <div className="ft-map__frame">
        {near && <iframe title={`Map: ${MAP_PLACE}`} src={MAP_EMBED} referrerPolicy="no-referrer-when-downgrade" />}
        <span className="ft-map__veil" aria-hidden="true" />
        <span className="ft-map__pin" aria-hidden="true" />
        <div className="ft-map__plate">
          <p className="ft-map__kicker">
            <Star className="h-2 w-2 text-gold-400" /> Find the launch pad
          </p>
          <p className="ft-map__name">{BRAND.universityFull}</p>
          <p className="ft-map__addr">{BRAND.campus} · Bangalore, Karnataka</p>
          <a href={MAP_DIRECTIONS} target="_blank" rel="noopener noreferrer" className="ft-map__go">
            Get directions
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 14 14 6M8 6h6v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function SiteFooter({ map = true }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => el.classList.toggle('is-live', e.isIntersecting), { rootMargin: '80px 0px' });
    io.observe(el);
    let raf = 0;
    const onMove = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    };
    el.addEventListener('pointermove', onMove);
    return () => {
      io.disconnect();
      el.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const openFaq = () => window.dispatchEvent(new Event('cubyc:open-chat'));

  const renderLink = (l) =>
    l.action === 'chat' ? (
      <button type="button" onClick={openFaq} className="ft-link">
        <span>{l.label}</span>
        <small>{l.note}</small>
      </button>
    ) : l.href ? (
      <a href={l.href} className="ft-link">
        <span>{l.label}</span>
      </a>
    ) : (
      <span className="ft-link is-soon" aria-disabled="true">
        <span>{l.label}</span>
        <small>Soon</small>
      </span>
    );

  const column = (title, label, links) => (
    <nav className="ft-col" aria-label={label}>
      <h3 className="ft-col__title">
        <Star className="h-2 w-2 text-gold-400" />
        {title}
      </h3>
      <ul>
        {links.map((l) => (
          <li key={l.label}>{renderLink(l)}</li>
        ))}
      </ul>
    </nav>
  );

  return (
    <footer ref={ref} className="ft" aria-label="Site footer">
      {/* ---------- Giant wordmark, blurred into the background ---------- */}
      <p className="ft-word" aria-hidden="true">
        <span className="ft-word__text">{BRAND.fest}</span>
      </p>

      {/* ---------- The docking scene (over the live site background) ---------- */}
      <div className="ft-sky" aria-hidden="true">
        <div className="ft-dock">
          <svg className="ft-path" viewBox="0 0 1000 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ft-path-fade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#f3d9a4" stopOpacity="0" />
                <stop offset="0.45" stopColor="#f3d9a4" stopOpacity="0.28" />
                <stop offset="1" stopColor="#f3d9a4" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* Ends at y = 90 / 120 — exactly the docking port's height */}
            <path d="M0 118 C320 104 640 92 1000 90" stroke="url(#ft-path-fade)" />
          </svg>
          <div className="ft-station" title="CUBYC orbital station">
            <Station />
            <span className="ft-dock__pulse" />
            <span className="ft-station__tag">
              <b>CUBYC-01</b> Orbital station
            </span>
          </div>
          <div className="ft-shuttle">
            <Shuttle />
          </div>
          <p className="ft-dock__status">
            <span className="ft-dock__led" />
            <span className="ft-dock__msg ft-dock__msg--a">Approach · port 01</span>
            <span className="ft-dock__msg ft-dock__msg--b">Docked · welcome aboard</span>
            <span className="ft-dock__msg ft-dock__msg--c">Undocking · clear skies</span>
          </p>
          <p className="ft-readout">
            <span>Orbit 408 km</span>
            <span>Velocity 7.66 km/s</span>
            <span>Port 01 · Yeshwanthpur</span>
          </p>
        </div>
      </div>

      {/* ---------- Brand + socials (left) · links (right) ---------- */}
      <div className="ft-body">
        <div className="ft-brand">
          <div className="flex items-center gap-4">
            <FestMark className="h-16 sm:h-20" />
            <div>
              <p className="ft-brand__name">{BRAND.fest}</p>
              <p className="ft-brand__ed">{BRAND.edition}</p>
            </div>
          </div>
          <p className="ft-brand__blurb">
            {BRAND.subline} at {BRAND.universityFull}, {BRAND.campus}. {BRAND.tagline}
          </p>
          <ul className="ft-social">
            {SOCIAL.map((s) => (
              <li key={s.key}>
                {s.href ? (
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND.fest} on ${s.label}`} className="ft-social__btn">
                    <svg viewBox="0 0 20 20" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      {SOCIAL_ICONS[s.key]}
                    </svg>
                  </a>
                ) : (
                  <span className="ft-social__btn is-soon" title={`${s.label} — coming soon`} aria-label={`${s.label} (coming soon)`}>
                    <svg viewBox="0 0 20 20" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      {SOCIAL_ICONS[s.key]}
                    </svg>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="ft-links">
          {column('Useful links', 'Useful links', USEFUL)}
          {column('Policies', 'Policies', POLICIES)}
          {column('Explore', 'Explore', EXPLORE)}
        </div>
      </div>

      {/* ---------- Ornament + bottom bar ---------- */}
      {map && <FooterMap />}

      <div className="ft-ornament" aria-hidden="true">
        <Cloud className="ft-ornament__cloud" />
        <span className="ft-ornament__line" />
        <i className="ft-ornament__gem" />
        <span className="ft-ornament__line" />
        <Cloud className="ft-ornament__cloud ft-ornament__cloud--r" />
      </div>
      <div className="ft-bar">
        <div className="ft-bar__copy">
          <FestMark className="h-6" />
          <span>
            © 2027 {BRAND.fest} · {BRAND.edition}
            <small>Made with stardust on campus</small>
          </span>
        </div>
        <div className="ft-uni">
          <BrandLogo className="ft-uni__logo" title={BRAND.universityFull} />
        </div>
      </div>
    </footer>
  );
}
