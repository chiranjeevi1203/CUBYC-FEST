/**
 * Campus gallery photos.
 *
 * Drop images into src/assets/gallery/ (jpg, jpeg, png, webp or avif) and they
 * appear on the gallery page automatically, in filename order (cs-2 before cs-10).
 *
 * Titles come from the filename:
 *   "cs-1.jpg"               → "Computer Science" · Moment 01   (department code + number)
 *   "01-main-auditorium.jpg" → "Main Auditorium"                (any other name)
 *
 * Keep photos around 2000 px on the long side (full-size originals can live in
 * /gallery-originals, which isn't published). Until photos are added, the page
 * uses the illustrated placeholders.
 *
 * Optional thumbnails: a same-named file in src/assets/gallery/thumbs/ (about
 * 720 px, e.g. cs-01.webp) is used for the small sliding tiles on the landing
 * page, so they load fast; the gallery page keeps the full photo. Without one,
 * the tile simply uses the full photo.
 */
const files = import.meta.glob('../assets/gallery/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const thumbFiles = import.meta.glob('../assets/gallery/thumbs/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});
const baseName = (path) => path.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase();
const THUMBS = Object.fromEntries(Object.entries(thumbFiles).map(([path, url]) => [baseName(path), url]));

/** Filename prefix → department (for names like "cs-3.jpg"). */
const DEPT_CODES = {
  cs: 'Computer Science',
  psy: 'Psychology',
  eco: 'Economics',
  math: 'Mathematics',
  maths: 'Mathematics',
  com: 'Commerce',
  media: 'Media Studies',
  eng: 'English & Cultural Studies',
  sbm: 'Management',
  mgmt: 'Management',
  dps: 'Professional Studies',
  swo: 'Cultural Events',
  cult: 'Cultural Events',
  campus: 'Campus',
};

const pad = (n) => String(n).padStart(2, '0');

function describe(path) {
  const base = path.split('/').pop().replace(/\.[^.]+$/, '');
  const coded = base.match(/^([a-z]+)[-_\s]*(\d+)$/i);
  if (coded && DEPT_CODES[coded[1].toLowerCase()]) {
    const dept = DEPT_CODES[coded[1].toLowerCase()];
    return { title: dept, caption: `Moment ${pad(coded[2])} · CHRIST (Deemed to be University) · Yeshwanthpur Campus` };
  }
  const title = base
    .replace(/^\d+[-_\s]*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  return { title: title || 'Campus', caption: 'CHRIST (Deemed to be University) · Yeshwanthpur Campus' };
}

const sorted = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, src]) => ({ src, thumb: THUMBS[baseName(path)] ?? src, group: path.split('/').pop().replace(/[-_\s]*\d*\.[^.]+$/, '').toLowerCase(), ...describe(path) }));

/**
 * A fresh random mix on every visit: each department's photos are shuffled,
 * then photos are drawn at random — weighted by how many each department has
 * left — never taking the same department twice in a row, so the gallery
 * always looks varied and every department is spread through it.
 */
function shuffleMix(items) {
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const groups = new Map();
  items.forEach((it) => groups.set(it.group, [...(groups.get(it.group) ?? []), it]));
  const queues = [...groups.values()].map(shuffle);
  const out = [];
  let last = null;
  while (queues.some((q) => q.length)) {
    const open = queues.filter((q) => q.length && q[0].group !== last);
    // Only one department left: its photos have to sit together at the end.
    const pool = open.length ? open : queues.filter((q) => q.length);
    // Departments with more photos left are much likelier, so none piles up at the end.
    let r = Math.random() * pool.reduce((n, q) => n + q.length ** 2, 0);
    const pick = pool.find((q) => (r -= q.length ** 2) < 0) ?? pool[pool.length - 1];
    const item = pick.shift();
    out.push(item);
    last = item.group;
  }
  return out;
}

/** The campus photos (empty until images are added — callers fall back to the illustrations). */
export const CAMPUS_PHOTOS = shuffleMix(sorted);
