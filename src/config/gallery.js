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
 */
const files = import.meta.glob('../assets/gallery/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Filename prefix → department (for names like "cs-3.jpg"). */
const DEPT_CODES = {
  cs: 'Computer Science',
  psy: 'Psychology',
  eco: 'Economics',
  math: 'Mathematics',
  maths: 'Mathematics',
  com: 'Commerce',
  media: 'Media Studies',
  eng: 'Cultural Studies & Languages',
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
    return { title: dept, caption: `Moment ${pad(coded[2])} · Christ University · Yeshwanthpur Campus` };
  }
  const title = base
    .replace(/^\d+[-_\s]*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  return { title: title || 'Campus', caption: 'Christ University · Yeshwanthpur Campus' };
}

const sorted = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, src]) => ({ src, group: path.split('/').pop().replace(/[-_\s]*\d*\.[^.]+$/, '').toLowerCase(), ...describe(path) }));

/**
 * Round-robin across groups (cs-1, psy-1, cs-2, psy-2 …) so photos from the same
 * department never arrive back to back — including when the list wraps around.
 */
function interleave(items) {
  const groups = new Map();
  items.forEach((it) => groups.set(it.group, [...(groups.get(it.group) ?? []), it]));
  const queues = [...groups.values()].sort((a, b) => b.length - a.length);
  const out = [];
  while (queues.some((q) => q.length)) queues.forEach((q) => q.length && out.push(q.shift()));
  return out;
}

/** The campus photos (empty until images are added — callers fall back to the illustrations). */
export const CAMPUS_PHOTOS = interleave(sorted);
