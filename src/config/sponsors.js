/**
 * Sponsors for the Sponsors page (#/sponsors).
 *
 * EDIT THIS FILE to add the real sponsors. Each sponsor is
 *   { name, tagline?, logo?, url? }
 * - `logo`: an imported image (put files in src/assets/sponsors/ and import them),
 *   ideally a transparent PNG / SVG; without it the card shows the name as a wordmark.
 * - `url`: the sponsor's website (opens in a new tab).
 * Leave `name` empty ('') for an open slot ("Your brand here").
 */
const open = (n) => Array.from({ length: n }, () => ({ name: '' }));

export const SPONSOR_TIERS = [
  {
    key: 'title',
    title: 'Title Sponsor',
    kicker: 'Powering the orbit',
    tone: 'title',
    sponsors: open(1),
  },
  {
    key: 'gold',
    title: 'Gold Sponsors',
    kicker: 'First magnitude',
    tone: 'gold',
    sponsors: open(3),
  },
  {
    key: 'silver',
    title: 'Silver Sponsors',
    kicker: 'Bright companions',
    tone: 'silver',
    sponsors: open(4),
  },
  {
    key: 'partners',
    title: 'Partners',
    kicker: 'Fellow travellers',
    tone: 'partner',
    sponsors: open(6),
  },
];

/** Who to write to about sponsorship (shown in the closing section). */
export const SPONSOR_CONTACT = {
  email: '',
  note: 'Sponsorship decks and custom packages are available on request.',
};
