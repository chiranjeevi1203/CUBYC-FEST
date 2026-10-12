/* Watercolour planet "paint" for DOM planets — layered CSS gradients, shaded by .wc-sphere::after. */
export const PLANET_ART = {
  mercury:
    'radial-gradient(circle at 70% 60%, rgba(70,58,52,.55) 0 9%, transparent 11%), radial-gradient(circle at 30% 70%, rgba(80,66,60,.4) 0 7%, transparent 9%), radial-gradient(circle at 40% 35%, #e4d6c9 0%, #a6958a 40%, #6b5d56 100%)',
  venus:
    'repeating-linear-gradient(172deg, rgba(255,240,210,.35) 0 6%, transparent 6% 13%), radial-gradient(circle at 40% 35%, #fff1d2 0%, #f0cf96 35%, #c98d52 100%)',
  earth:
    'radial-gradient(ellipse 30% 22% at 62% 40%, #6aa94f 0 70%, transparent 72%), radial-gradient(ellipse 18% 26% at 32% 64%, #5e9a48 0 70%, transparent 72%), radial-gradient(ellipse 40% 10% at 50% 8%, #f4f6f8 0 70%, transparent 72%), radial-gradient(ellipse 22% 8% at 70% 72%, rgba(255,255,255,.75) 0 60%, transparent 70%), radial-gradient(circle at 40% 35%, #a8d8ff 0%, #3f86d6 35%, #1f4f99 100%)',
  mars:
    'radial-gradient(ellipse 30% 14% at 55% 55%, rgba(110,40,18,.55) 0 60%, transparent 70%), radial-gradient(ellipse 30% 8% at 50% 6%, rgba(255,240,230,.85) 0 60%, transparent 70%), radial-gradient(circle at 40% 35%, #ffc49c 0%, #e0794a 40%, #a3401f 100%)',
  jupiter:
    'radial-gradient(ellipse 14% 8% at 66% 64%, #b4513a 0 70%, transparent 75%), repeating-linear-gradient(178deg, #f1dfc2 0 8%, #c99766 8% 13%, #e8cfa8 13% 21%, #a86f47 21% 25%, #ecd6b4 25% 31%)',
  saturn: 'repeating-linear-gradient(176deg, #f3e3bd 0 9%, #d8b77c 9% 15%, #efdcb2 15% 23%, #c49e63 23% 27%)',
  uranus: 'radial-gradient(circle at 40% 35%, #e3fbfb 0%, #a3dde0 40%, #6fb2bb 100%)',
  moon:
    'radial-gradient(circle at 62% 38%, rgba(120,114,104,.55) 0 10%, transparent 12%), radial-gradient(circle at 34% 62%, rgba(110,104,96,.5) 0 13%, transparent 15%), radial-gradient(circle at 58% 72%, rgba(130,124,114,.4) 0 6%, transparent 8%), radial-gradient(circle at 40% 35%, #f2eee6 0%, #bdb8ae 45%, #7d786f 100%)',
  neptune:
    'radial-gradient(ellipse 14% 8% at 40% 58%, #1d2a6e 0 70%, transparent 75%), repeating-linear-gradient(176deg, rgba(160,190,255,.25) 0 10%, transparent 10% 22%), radial-gradient(circle at 40% 35%, #a5c0ff 0%, #3e63d4 45%, #22357f 100%)',
};

