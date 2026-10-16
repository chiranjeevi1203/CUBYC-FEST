import SiteNav from '../ui/SiteNav';
import Star from '../ui/Star';
import blackHole from '../../assets/system/black-hole.jpg';
import { OrnateDivider } from '../about/Ornaments';
import { useMountedWhile, usePageShell } from '../about/usePageShell';
import { useExperience } from '../../store/useExperience';

function NotFoundView({ open, onGone }) {
  const rootRef = usePageShell({
    open,
    onGone,
    leaveHash: '#home',
    onEnter: (tl) => {
      tl.fromTo(
        rootRef.current.querySelectorAll('[data-hero]'),
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1, clearProps: 'transform' },
        0.2,
      );
    },
  });
  const lost = window.location.pathname !== '/' ? window.location.pathname : window.location.hash;

  return (
    <div ref={rootRef} className="space-page nf-page fixed inset-0 z-40 overflow-y-auto overflow-x-hidden overscroll-contain text-[#f4f1ea]" data-no-orbit>
      <div className="nf-sky" aria-hidden="true">
        <span className="nf-sky__band" />
        <span className="nf-sky__stars" />
        <span className="nf-sky__stars nf-sky__stars--b" />
      </div>
      <SiteNav />
      <main className="nf-main">
        <div data-hero className="nf-code" aria-label="Error 404">
          <span className="nf-digit">4</span>
          <span className="nf-hole" aria-hidden="true">
            <img src={blackHole} alt="" className="nf-hole__img" />
          </span>
          <span className="nf-digit">4</span>
        </div>

        <p data-hero className="mt-6 inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
          <Star className="h-2 w-2 text-gold-400/70" />
          Signal lost
          <Star className="h-2 w-2 text-gold-400/70" />
        </p>
        <h1 data-hero className="title-cosmic mt-3 font-display text-[clamp(1.8rem,5vw,3.4rem)] font-bold leading-tight tracking-[0.08em] uppercase">
          Lost in space
        </h1>
        <span data-hero className="mt-4 block">
          <OrnateDivider className="mx-auto w-60 text-gold-300/70" />
        </span>
        <p data-hero className="mx-auto mt-5 max-w-md text-[0.98rem] leading-relaxed text-white/65">
          This sector of the galaxy is uncharted. The page you were looking for drifted out of orbit — or never existed.
        </p>
        {lost && (
          <p data-hero className="nf-coords">
            Last known coordinates <code>{lost}</code>
          </p>
        )}
        <div data-hero className="mt-9 flex flex-wrap justify-center gap-3">
          <a href="/#home" className="nf-btn nf-btn--main">
            Return to orbit
          </a>
          <a href="/#/events" className="nf-btn">
            Explore events
          </a>
        </div>
      </main>
    </div>
  );
}

/** The 404 page: any unknown #/… address or path. */
export default function NotFoundPage() {
  const open = useExperience((s) => s.notFound);
  const [mounted, onGone] = useMountedWhile(open);
  if (!mounted) return null;
  return <NotFoundView open={open} onGone={onGone} />;
}
