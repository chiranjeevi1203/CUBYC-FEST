import { GALLERY } from '../components/Gallery';

/**
 * Campus gallery photos.
 *
 * Drop images into src/assets/gallery/ (jpg, jpeg, png, webp or avif) and they
 * appear on the gallery page automatically, in filename order. The title comes
 * from the filename: "01-main-auditorium.jpg" → "Main Auditorium".
 * Until photos are added, the page uses the illustrated placeholders.
 */
const files = import.meta.glob('../assets/gallery/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const titleFrom = (path) =>
  path
    .split('/')
    .pop()
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[-_\s]*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

const photos = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src]) => ({ src, title: titleFrom(path) || 'Campus', caption: 'Christ University · Yeshwanthpur Campus' }));

export const GALLERY_PHOTOS = photos.length ? photos : GALLERY;
export const USING_PLACEHOLDERS = photos.length === 0;
