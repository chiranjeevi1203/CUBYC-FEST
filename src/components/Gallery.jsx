import { memo } from 'react';
import Frame from './ui/Frame';
import { CAMPUS_PHOTOS } from '../config/gallery';

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

export function Media({ item, uid }) {
  if (item.src) {
    return <img src={item.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />;
  }
  return (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <Art kind={item.art} uid={uid} />
    </svg>
  );
}

function GalleryTile({ item, uid, duplicate, soft }) {
  return (
    <figure className="gallery__item" data-cursor="hover" aria-hidden={duplicate || undefined}>
      <Frame size="sm" star={false} className="gallery__frame" />
      <div className="gallery__media">
        <Media item={item} uid={`${uid}-a`} />
        {/* Pre-blurred copy; hover fades it out, so only opacity animates. */}
        {soft && (
          <div className="gallery__blur">
            <Media item={item} uid={`${uid}-b`} />
          </div>
        )}
        <div className="gallery__shade" />
      </div>
      <figcaption className="gallery__caption">
        <span className="font-display text-base leading-none font-bold tracking-[0.1em] text-white uppercase">{item.title}</span>
        <span className="font-mono text-[0.55rem] tracking-[0.3em] text-gold-300/90 uppercase">{item.caption}</span>
      </figcaption>
      <span className="gallery__glow" aria-hidden="true" />
    </figure>
  );
}

/** Slow, seamless right-to-left drift: two identical sets, translated by -50%. */
/** What the site shows: the campus photos if any were added, else the illustrations. */
export const GALLERY_ITEMS = CAMPUS_PHOTOS.length ? CAMPUS_PHOTOS : GALLERY;

function Gallery({ quality }) {
  // Illustrations sit soft until hovered; real photos are shown sharp.
  const photos = CAMPUS_PHOTOS.length > 0;
  const soft = quality !== 'low' && !photos;
  return (
    <section id="gallery" aria-label="Moments from past fests" className="relative scroll-mt-28 py-16 sm:py-24">
      <p data-reveal className="mb-8 text-center font-mono text-[0.65rem] tracking-[0.4em] text-gold-300/70 uppercase">
        Moments from past orbits
      </p>
      <div data-reveal className={`gallery ${photos ? 'gallery--photos' : ''}`}>
        <div className="gallery__track">
          {[0, 1].map((set) =>
            GALLERY_ITEMS.map((item, i) => (
              <GalleryTile key={`${set}-${i}`} item={item} uid={`g${set}-${i}`} duplicate={set === 1} soft={soft} />
            )),
          )}
        </div>
      </div>
    </section>
  );
}

export default memo(Gallery);
