import SiteNav from '../ui/SiteNav';
import SiteFooter from '../ui/SiteFooter';
import Star from '../ui/Star';
import SolarButton from '../ui/SolarButton';
import SpaceBackdrop from '../about/SpaceBackdrop';
import { OrnateCorners, OrnateDivider } from '../about/Ornaments';
import { useMountedWhile, usePageShell, useRiseIn } from '../about/usePageShell';
import ContactCard from './ContactCard';
import { BRAND, EVENT } from '../../config/experience';
import { TEAM_SECTIONS } from '../../config/team';
import { useExperience } from '../../store/useExperience';
import { useViewMore, ViewMoreButton } from '../ui/ViewMore';

const PLACE = 'Christ University Yeshwanthpur Campus, Bengaluru';
const MAP_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(PLACE)}&z=16&output=embed`;
const MAP_DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(PLACE)}`;

/** Sections shown on this page, from config/team.js. */
const GROUPS = [
  { key: 'faculty-core', title: 'Faculty Coordinators', kicker: 'Mission control' },
  { key: 'student-committee', title: 'Student Core Heads', kicker: 'The command deck' },
].map((g) => ({ ...g, people: TEAM_SECTIONS.find((s) => s.key === g.key)?.people ?? [] }));

function SectionHead({ kicker, title, count }) {
  return (
    <div data-rise className="text-center">
      <p className="font-mono text-[0.58rem] tracking-[0.36em] text-gold-300/70 uppercase">{kicker}</p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.1em] uppercase sm:text-3xl">{title}</h2>
      <OrnateDivider className="mx-auto mt-3 w-52 text-gold-300/60" />
      {count != null && <p className="mt-2 font-mono text-[0.55rem] tracking-[0.3em] text-white/40 uppercase">{String(count).padStart(2, '0')} contacts</p>}
    </div>
  );
}

/** A group of contacts; phones show the first three until "View more". */
function ContactGroup({ g }) {
  const vm = useViewMore(g.people.length, 3);
  return (
    <section className="mt-[clamp(3.5rem,8vw,5.5rem)]" aria-label={g.title}>
      <SectionHead kicker={g.kicker} title={g.title} count={g.people.length} />
      <ul className="ct-grid">
        {g.people.map((p, i) => (
          <ContactCard key={`${p.name}-${p.role}-${i}`} person={p} index={i} className={vm.cls(i)} />
        ))}
      </ul>
      <ViewMoreButton {...vm} />
    </section>
  );
}

function ContactView({ open, onGone }) {
  const rootRef = usePageShell({
    open,
    onGone,
    leaveHash: '#home',
    onEnter: (tl) => {
      tl.fromTo(
        rootRef.current.querySelectorAll('[data-hero]'),
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, clearProps: 'transform' },
        0.25,
      );
    },
  });
  useRiseIn(rootRef);

  return (
    <div ref={rootRef} className="space-page fixed inset-0 z-40 overflow-y-auto overflow-x-hidden overscroll-contain text-[#f4f1ea]" data-no-orbit>
      <SpaceBackdrop />
      <SiteNav active="contact" />

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-[calc(env(safe-area-inset-top)+6.5rem)] sm:px-8 sm:pt-32">
        {/* ---------- Hero ---------- */}
        <header className="flex flex-col items-center text-center">
          <p data-hero className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
            <Star className="h-2 w-2 text-gold-400/70" />
            Open a channel
            <Star className="h-2 w-2 text-gold-400/70" />
          </p>
          <h1 data-hero className="title-cosmic mt-4 font-display text-[clamp(2.4rem,7vw,4.8rem)] font-bold leading-none tracking-[0.1em] uppercase">
            Contact
          </h1>
          <span data-hero className="mt-5 block">
            <OrnateDivider className="w-64 text-gold-300/70" />
          </span>
          <p data-hero className="mt-5 max-w-xl text-[0.98rem] leading-relaxed text-white/65">
            Questions about events, registration or the day itself? Reach the {BRAND.fest} crew directly — or ask CB-27, our chat droid, any time.
          </p>
          <div data-hero className="mt-7 flex flex-wrap justify-center gap-3">
            <SolarButton variant="ghost" onClick={() => window.dispatchEvent(new Event('cubyc:open-chat'))}>
              Ask CB-27
            </SolarButton>
            <SolarButton href="#ct-map" variant="ghost" onClick={(e) => {
              e.preventDefault();
              rootRef.current?.querySelector('#ct-map')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Find the campus
            </SolarButton>
          </div>
        </header>

        {/* ---------- People ---------- */}
        {GROUPS.map((g) => (
          <ContactGroup key={g.key} g={g} />
        ))}

        {/* ---------- Map ---------- */}
        <section id="ct-map" className="mt-[clamp(4rem,9vw,6.5rem)] scroll-mt-24" aria-label="Campus map">
          <SectionHead kicker="Find the launch pad" title="Christ University · Yeshwanthpur" />
          <div className="ct-map-wrap">
            <div data-rise className="ct-map">
              <OrnateCorners />
              <div className="ct-map__frame">
                <iframe title={`Map: ${PLACE}`} src={MAP_EMBED} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
                <span className="ct-map__pin" aria-hidden="true" />
              </div>
            </div>

            <aside data-rise className="ct-venue" style={{ '--i': 1 }}>
              <OrnateCorners />
              <span className="ct-venue__icon" aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <path d="M10 17s-5.5-5-5.5-9a5.5 5.5 0 0 1 11 0c0 4-5.5 9-5.5 9Z M10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                </svg>
              </span>
              <h3 className="ct-venue__title">The venue</h3>
              <OrnateDivider className="mx-auto my-3 w-36 text-gold-300/50" />
              <p className="ct-venue__line">
                <b>{BRAND.universityFull}</b>
                {BRAND.campus}, Bengaluru, Karnataka
              </p>
              <dl className="ct-venue__facts">
                <div>
                  <dt>Dates</dt>
                  <dd>{EVENT.dateLabel}</dd>
                </div>
                <div>
                  <dt>Entry</dt>
                  <dd>Valid college ID required</dd>
                </div>
              </dl>
              <div className="ct-venue__btns">
                <SolarButton href={MAP_DIRECTIONS} target="_blank" rel="noopener noreferrer">
                  Get directions
                </SolarButton>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter map={false} />
    </div>
  );
}

/** The Contact page (#/contact). */
export default function ContactPage() {
  const open = useExperience((s) => s.contactOpen);
  const [mounted, onGone] = useMountedWhile(open);
  if (!mounted) return null;
  return <ContactView open={open} onGone={onGone} />;
}
