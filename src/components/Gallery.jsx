import { memo, useEffect, useRef } from 'react';
import Frame from './ui/Frame';
import SolarButton from './ui/SolarButton';
import Star from './ui/Star';
import { CAMPUS_PHOTOS } from '../config/gallery';
import { prefersReducedMotion } from '../config/experience';

/**
 * Past-fest moments. Each tile is procedural SVG art so the site ships with no
 * image assets. To use real photos, add `src: '/gallery/stage.jpg'` (files in
 * /public) to an item and it renders the photo instead of the art.
 */
export const GALLERY = [
  { title: 'Main Stage', caption: 'CUBYC ’26 · Headline night', art: 'stage' },
  { title: 'Robo Wars', caption: 'Arena finals', art: 'robots' },
  { title: 'Code Sprint', caption: '24 hours, 300 builders', art: 'hack' },
  { title: 'Culture Night', caption: 'Dance & theatre', art: 'dance' },
  { title: 'Fine Arts', caption: 'Live gallery', art: 'arts' },
  { title: 'Campus After Dark', caption: 'Closing night', art: 'night' },
  { title: 'Impact Summit', caption: 'Keynote hall', art: 'summit' },
  { title: 'Deep Play', caption: 'E-sports grand finals', art: 'esports' },
];

function Art({ kind, uid }) {
  const id = (name) => `${uid}-${name}`;
  const url = (name) => `url(#${id(name)})`;

  switch (kind) {
    case 'stage':
      return (
        <>
          <defs>
            <linearGradient id={id('bg')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#140b33" />
              <stop offset="1" stopColor="#3a1a5c" />
            </linearGradient>
            <linearGradient id={id('beam')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffd98a" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="400" height="280" fill={url('bg')} />
          {[60, 150, 250, 340].map((x, i) => (
            <polygon key={x} points={`${x - 6},0 ${x + 6},0 ${x + 70 - i * 30},280 ${x - 70 + i * 20},280`} fill={url('beam')} opacity="0.55" />
          ))}
          <rect x="70" y="170" width="260" height="14" rx="3" fill="#0b0618" />
          <circle cx="200" cy="150" r="16" fill="#fff1d0" opacity="0.9" />
          {Array.from({ length: 22 }, (_, i) => (
            <circle key={i} cx={10 + i * 18.5} cy={262 - (i % 3) * 5} r={13 + (i % 2) * 3} fill="#07040f" />
          ))}
        </>
      );
    case 'robots':
      return (
        <>
          <defs>
            <radialGradient id={id('arena')} cx="50%" cy="65%" r="60%">
              <stop offset="0" stopColor="#ff9a4a" stopOpacity="0.85" />
              <stop offset="0.5" stopColor="#7a2a10" stopOpacity="0.5" />
              <stop offset="1" stopColor="#0a0d24" stopOpacity="1" />
            </radialGradient>
          </defs>
          <rect width="400" height="280" fill="#0a0d24" />
          <ellipse cx="200" cy="190" rx="190" ry="70" fill={url('arena')} />
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={200} y1={110} x2={-100 + i * 75} y2={280} stroke="#6fa0ff" strokeOpacity="0.25" />
          ))}
          <rect x="120" y="165" width="54" height="34" rx="6" fill="#d9e2ff" />
          <rect x="128" y="172" width="12" height="8" rx="2" fill="#ff9a4a" />
          <rect x="232" y="160" width="60" height="40" rx="6" fill="#ffc46b" />
          <rect x="270" y="168" width="14" height="9" rx="2" fill="#1d2a6e" />
          <circle cx="205" cy="182" r="5" fill="#fff4d6" />
        </>
      );
    case 'hack':
      return (
        <>
          <rect width="400" height="280" fill="#060a1a" />
          {Array.from({ length: 3 }, (_, row) =>
            Array.from({ length: 4 }, (_, col) => (
              <g key={`${row}-${col}`} transform={`translate(${22 + col * 94} ${28 + row * 82})`}>
                <rect width="80" height="56" rx="5" fill="#0f1f44" stroke="#4fd1ff" strokeOpacity="0.35" />
                {[10, 20, 30, 40].map((y, k) => (
                  <rect key={y} x="8" y={y} width={20 + ((row * 7 + col * 5 + k * 11) % 46)} height="3" rx="1.5" fill={k % 2 ? '#e9c27a' : '#4fd1ff'} opacity="0.7" />
                ))}
              </g>
            )),
          )}
        </>
      );
    case 'dance':
      return (
        <>
          <defs>
            <radialGradient id={id('spot')} cx="50%" cy="55%" r="55%">
              <stop offset="0" stopColor="#ff7ac3" stopOpacity="0.75" />
              <stop offset="0.6" stopColor="#6b4fd8" stopOpacity="0.4" />
              <stop offset="1" stopColor="#0c0820" />
            </radialGradient>
          </defs>
          <rect width="400" height="280" fill={url('spot')} />
          {Array.from({ length: 46 }, (_, i) => (
            <circle key={i} cx={(i * 83) % 400} cy={(i * 47) % 200} r={1.5 + (i % 3)} fill={i % 2 ? '#f3d9a4' : '#ffb3dd'} opacity="0.8" />
          ))}
          <path d="M150 260 q20 -90 40 -60 q10 -40 20 0 q25 -40 40 60 z" fill="#0c0820" />
          <circle cx="200" cy="160" r="12" fill="#0c0820" />
        </>
      );
    case 'arts':
      return (
        <>
          <defs>
            <radialGradient id={id('b1')}>
              <stop offset="0" stopColor="#e9c27a" stopOpacity="0.9" />
              <stop offset="1" stopColor="#e9c27a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={id('b2')}>
              <stop offset="0" stopColor="#6b4fd8" stopOpacity="0.9" />
              <stop offset="1" stopColor="#6b4fd8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={id('b3')}>
              <stop offset="0" stopColor="#3e8fd6" stopOpacity="0.85" />
              <stop offset="1" stopColor="#3e8fd6" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="280" fill="#f2ead8" />
          <circle cx="130" cy="120" r="110" fill={url('b2')} />
          <circle cx="250" cy="170" r="120" fill={url('b1')} />
          <circle cx="310" cy="80" r="80" fill={url('b3')} />
          <rect x="18" y="18" width="364" height="244" fill="none" stroke="#a97a2f" strokeWidth="6" />
        </>
      );
    case 'night':
      return (
        <>
          <defs>
            <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#05060d" />
              <stop offset="1" stopColor="#22306e" />
            </linearGradient>
          </defs>
          <rect width="400" height="280" fill={url('sky')} />
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={(i * 97) % 400} cy={(i * 31) % 150} r={i % 5 === 0 ? 1.6 : 0.9} fill="#fff" opacity="0.8" />
          ))}
          <circle cx="320" cy="60" r="20" fill="#fff1d0" />
          <path d="M0 280 V200 h40 v-30 h30 v30 h50 v-60 l30 -25 l30 25 v60 h40 v-40 h50 v40 h40 v-20 h40 v20 h50 V280 z" fill="#05060d" />
          {[[150, 160], [168, 160], [186, 160], [150, 180], [186, 180], [250, 190], [268, 190]].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="8" height="10" fill="#ffd27a" opacity="0.85" />
          ))}
        </>
      );
    case 'summit':
      return (
        <>
          <defs>
            <linearGradient id={id('hall')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1430" />
              <stop offset="1" stopColor="#13284f" />
            </linearGradient>
          </defs>
          <rect width="400" height="280" fill={url('hall')} />
          <rect x="110" y="40" width="180" height="100" rx="6" fill="#5e9a48" opacity="0.85" />
          <circle cx="200" cy="90" r="30" fill="#2c6cb8" />
          <path d="M184 80 q16 -14 30 4 q-6 18 -24 14 z" fill="#5e9a48" />
          <rect x="182" y="150" width="36" height="40" rx="3" fill="#e9c27a" />
          {[0, 1, 2].map((row) => (
            <path key={row} d={`M0 ${222 + row * 22} Q200 ${196 + row * 22} 400 ${222 + row * 22}`} stroke="#07101f" strokeWidth="18" fill="none" />
          ))}
        </>
      );
    case 'esports':
    default:
      return (
        <>
          <rect width="400" height="280" fill="#070414" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={20 + i * 31} y={200 - ((i * 37) % 120)} width="18" height={60 + ((i * 37) % 120)} rx="3" fill={i % 3 ? '#6b4fd8' : '#4fd1ff'} opacity="0.55" />
          ))}
          <rect x="120" y="96" width="160" height="78" rx="39" fill="#11082a" stroke="#4fd1ff" strokeWidth="2" />
          <circle cx="162" cy="135" r="12" fill="none" stroke="#e9c27a" strokeWidth="3" />
          <circle cx="240" cy="126" r="6" fill="#ff7ac3" />
          <circle cx="254" cy="142" r="6" fill="#4fd1ff" />
        </>
      );
  }
}

export function Media({ item, uid, eager = false, small = false }) {
  if (item.src) {
    const src = small ? (item.thumb ?? item.src) : item.src;
    return <img src={src} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />;
  }
  return (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <Art kind={item.art} uid={uid} />
    </svg>
  );
}

/** What the site shows: the campus photos if any were added, else the illustrations. */
export const GALLERY_ITEMS = CAMPUS_PHOTOS.length ? CAMPUS_PHOTOS : GALLERY;

const GALLERY_HREF = '#/gallery';
const COPIES = 4; // each row repeats its set so it always overfills the screen while it slides
const AUTO_SPEED = 26; // px/s the rows glide on their own
const SCROLL_FACTOR = 0.45; // px of extra travel per px scrolled

// The two layers: front (larger, nearer) and back (smaller, further). The photo
// list alternates departments, so taking them in pairs (0,3 | 1,2 | 4,7 | 5,6 …)
// keeps each row alternating departments too.
const ROWS = [
  { key: 'front', items: GALLERY_ITEMS.filter((_, i) => i % 4 === 0 || i % 4 === 3) },
  { key: 'back', items: GALLERY_ITEMS.filter((_, i) => i % 4 === 1 || i % 4 === 2) },
];

function Tile({ item, uid, hidden, soft }) {
  return (
    <a
      href={GALLERY_HREF}
      className="pgal__tile"
      data-cursor="hover"
      aria-label={hidden ? undefined : `${item.title} — open the gallery`}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      <Frame size="sm" star={false} className="pgal__frame" />
      <span className="pgal__media">
        <span className="pgal__img">
          <Media item={item} uid={`${uid}-a`} small />
        </span>
        {soft && (
          <span className="pgal__blur">
            <Media item={item} uid={`${uid}-b`} small />
          </span>
        )}
        <span className="pgal__shade" />
      </span>
      <span className="pgal__caption">
        <span className="font-display text-sm leading-none font-bold tracking-[0.1em] text-white uppercase sm:text-base">{item.title}</span>
        <span className="hidden font-mono text-[0.52rem] tracking-[0.3em] text-gold-300/90 uppercase sm:block">{item.caption}</span>
      </span>
      <span className="pgal__open" aria-hidden="true">
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
          <path d="M6 14 14 6M8 6h6v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="pgal__glow" aria-hidden="true" />
    </a>
  );
}

/**
 * "Moments from past orbits": a full-screen section with two rows of campus photos
 * that glide in opposite directions (front row left, back row right). Scrolling
 * pushes them further apart, scrolling back pulls them back, and each photo also
 * drifts inside its frame for depth. Every photo, and the "Travel back in
 * time" button, opens the black-hole gallery page.
 */
function Gallery({ quality }) {
  // Illustrations sit soft until hovered; real photos are shown sharp.
  const photos = CAMPUS_PHOTOS.length > 0;
  const soft = quality !== 'low' && !photos;
  const stageRef = useRef(null);
  const rowRefs = useRef([]);

  useEffect(() => {
    const stage = stageRef.current;
    const rows = rowRefs.current.filter(Boolean);
    if (!stage || !rows.length) return undefined;

    const reduced = prefersReducedMotion();
    let raf = 0;
    let visible = false;
    let last = 0;
    let travel = 0; // px each row has moved (auto drift + scroll), grows forever and wraps per set
    let scroll = window.scrollY; // smoothed scroll position
    let speed = 1; // eases down while the pointer is over the photos
    let hovering = false;
    let sets = rows.map(() => 0);

    const measure = () => {
      // Width of one set of photos (the row holds COPIES identical sets).
      sets = rows.map((row) => row.scrollWidth / COPIES);
    };

    // Size the tiles so the whole section (heading, both rows, button) fills
    // exactly one screen: whatever height the rest leaves, split across the rows.
    const section = stage.closest('section');
    let lastFit = '';
    const fit = () => {
      const vh = window.innerHeight;
      for (let pass = 0; pass < 2; pass++) {
        const rowsH = rows.reduce((n, r) => n + r.offsetHeight, 0);
        const other = section.offsetHeight - rowsH;
        // Photos lead: the section runs a little past one screen (×1.2) so the rows can be big.
        const h = Math.min(Math.max((vh * 1.2 - other) / 2, 190), 540);
        const v = `${h.toFixed(1)}px`;
        if (v === lastFit) break;
        lastFit = v;
        section.style.setProperty('--tile-h', v);
      }
      measure();
    };
    fit();
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(fit);

    const apply = () => {
      const r = stage.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(Math.max((vh - r.top) / (vh + r.height), 0), 1); // section progress through the screen
      rows.forEach((row, i) => {
        const w = sets[i];
        if (!w) return;
        const o = ((travel % w) + w) % w;
        // Front row runs left, back row runs right; both stay inside [-2w, -w] so the screen is always covered.
        const x = i === 0 ? -w - o : -2 * w + o;
        row.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
        row.style.setProperty('--drift', `${((p - 0.5) * (i === 0 ? -34 : 34)).toFixed(1)}px`);
      });
    };

    const tick = (now) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
      last = now;
      speed += ((hovering ? 0.12 : 1) - speed) * (1 - Math.exp(-dt * 4));
      const before = scroll;
      scroll += (window.scrollY - scroll) * (1 - Math.exp(-dt * 3.2)); // eased, so the push glides
      // Steady glide + the scroll pushing the rows further apart (scrolling up pulls them back).
      travel += AUTO_SPEED * speed * dt + (scroll - before) * SCROLL_FACTOR;
      apply();
      raf = visible ? requestAnimationFrame(tick) : 0;
    };

    measure();
    apply();
    if (reduced) {
      const onResize = () => {
        measure();
        apply();
      };
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('resize', fit);
      };
    }

    // Only animate while the section is near the screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) {
          last = performance.now();
          scroll = window.scrollY;
          raf = requestAnimationFrame(tick);
        }
      },
      { rootMargin: '150px 0px' },
    );
    io.observe(stage);
    const onEnter = () => (hovering = true);
    const onLeave = () => (hovering = false);
    stage.addEventListener('pointerenter', onEnter);
    stage.addEventListener('pointerleave', onLeave);
    const ro = new ResizeObserver(measure);
    rows.forEach((row) => ro.observe(row));

    return () => {
      window.removeEventListener('resize', fit);
      io.disconnect();
      ro.disconnect();
      stage.removeEventListener('pointerenter', onEnter);
      stage.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="gallery" aria-label="Moments from past fests" className="pgal relative">
      <div data-reveal className="pgal__head flex flex-col items-center gap-3 px-5 text-center sm:gap-4">
        <p className="inline-flex items-center gap-3 font-mono text-[0.65rem] tracking-[0.4em] text-gold-300/80 uppercase">
          <Star className="h-2 w-2 text-gold-400/70" />
          Moments from past orbits
          <Star className="h-2 w-2 text-gold-400/70" />
        </p>
        <h2 className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-[0.05em] uppercase sm:text-5xl">Light from earlier days</h2>
        <p className="max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
          Every photograph is light that left long ago. Tap any moment to step through the event horizon into the full gallery.
        </p>
      </div>

      <div ref={stageRef} data-reveal className={`pgal__stage ${photos ? 'pgal--photos' : ''}`}>
        {ROWS.map((row, r) => (
          <div key={row.key} ref={(el) => (rowRefs.current[r] = el)} className={`pgal__row pgal__row--${row.key}`}>
            {Array.from({ length: COPIES }, (_, set) =>
              row.items.map((item, i) => (
                <Tile key={`${set}-${i}`} item={item} uid={`p${r}-${set}-${i}`} hidden={set !== 1} soft={soft} />
              )),
            )}
          </div>
        ))}
      </div>

      <div data-reveal className="pgal__foot flex justify-center px-5">
        <SolarButton href={GALLERY_HREF} royal aria-label="Travel to the moments: open the gallery">
          Travel to the moments
        </SolarButton>
      </div>
    </section>
  );
}

export default memo(Gallery);
