import { DEPARTMENTS, DEPT_ORDER, EVENT_COUNT } from '../../config/departments';
import { BODY_BY_KEY, EVENT } from '../../config/experience';
import BodyIcon from '../ui/BodyIcon';
import Star from '../ui/Star';
import Frame from '../ui/Frame';

const pad = (n) => String(n).padStart(2, '0');
const worldOf = (k) => (k === 'moon' ? 'The Moon' : BODY_BY_KEY[k].name);

/**
 * Inside the sun: CUBYC, the host. A short welcome, the fest at a glance, and
 * the directory of every department — each card flies you to its world.
 */
export default function HubPanel({ onOpen }) {
  const hub = DEPARTMENTS.sun;
  const stats = [
    { value: pad(DEPT_ORDER.length), label: 'Domains' },
    { value: pad(EVENT_COUNT), label: 'Events' },
    { value: '02', label: 'Days' },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-24 sm:px-8 sm:pt-28">
      <header className="flex flex-col items-center text-center">
        <p className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
          <Star className="h-2 w-2 text-gold-400/70" />
          Inside the Sun
          <Star className="h-2 w-2 text-gold-400/70" />
        </p>
        <h2 className="title-cosmic mt-4 font-display text-[clamp(2.4rem,7vw,4.4rem)] font-bold leading-[1.02] tracking-[0.1em] [margin-right:-0.1em] uppercase">
          {hub.name}
        </h2>
        <p className="mt-3 font-mono text-[0.62rem] tracking-[0.3em] text-white/55 uppercase">
          {hub.org} · {EVENT.dateLabel}
        </p>
        <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-white/65">{hub.intro}</p>
        <div className="relative mt-8">
        <Frame size="sm" />
        <dl className="dept-hub-stats">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 px-5 sm:px-8">
              <dt className="order-2 font-mono text-[0.56rem] tracking-[0.3em] text-white/45 uppercase">{s.label}</dt>
              <dd className="text-gold-gradient font-display text-3xl font-bold sm:text-4xl">{s.value}</dd>
            </div>
          ))}
        </dl>
        </div>
      </header>

      <div className="mt-12 flex items-center gap-4 sm:mt-14">
        <h3 className="font-mono text-[0.62rem] tracking-[0.36em] text-gold-300/85 uppercase">Every world · Every domain</h3>
        <span className="h-px flex-1 bg-linear-to-r from-gold-400/40 to-transparent" aria-hidden="true" />
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DEPT_ORDER.map((key, i) => {
          const d = DEPARTMENTS[key];
          return (
            <li key={key}>
              <button type="button" onClick={() => onOpen(key)} className="dept-hub-card group relative">
                <Frame size="sm" star={false} />
                <BodyIcon bodyKey={key} className={`w-11 shrink-0 transition duration-700 group-hover:scale-110 ${key === 'saturn' ? 'mx-2' : ''}`} />
                <span className="flex min-w-0 flex-1 flex-col items-start text-left">
                  <span className="font-mono text-[0.55rem] tracking-[0.28em] text-white/40 uppercase">
                    {pad(i + 1)} · {worldOf(key)}
                  </span>
                  <span className="mt-1 font-display text-[0.95rem] font-bold leading-snug tracking-[0.08em] text-[#f6f1e7] uppercase">{d.name}</span>
                  <span className="mt-1 text-[0.8rem] leading-snug text-white/55">{d.tagline}</span>
                  <span className="mt-2 font-mono text-[0.56rem] tracking-[0.26em] text-gold-200/80 uppercase">
                    {pad(d.events.length)} event{d.events.length === 1 ? '' : 's'} <span className="ml-1 inline-block transition group-hover:translate-x-1">→</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
