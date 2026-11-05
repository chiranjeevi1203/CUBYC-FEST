import { useState } from 'react';

/*
 * Small, theme-matched charts for the admin dashboard. One series each (gold),
 * so no colour legend is needed — the panel title names the measure. Every bar
 * carries its value as text, and hovering (or focusing) a mark shows its details.
 */

const fmt = (n) => Number(n).toLocaleString('en-IN');

/** Horizontal bars, largest first: [{ label, value, sub? }]. */
export function BarList({ data, max: maxProp, empty = 'Nothing yet.', onPick, limit, unit = '' }) {
  const rows = limit ? data.slice(0, limit) : data;
  const max = maxProp ?? Math.max(1, ...rows.map((d) => d.value));
  if (!rows.length || rows.every((d) => !d.value)) return <p className="adm-empty">{empty}</p>;
  return (
    <ol className="adm-bars">
      {rows.map((d) => {
        const Tag = onPick ? 'button' : 'div';
        return (
          <li key={d.key ?? d.label}>
            <Tag type={onPick ? 'button' : undefined} className="adm-bar" onClick={onPick ? () => onPick(d) : undefined} title={`${d.label}: ${fmt(d.value)}${unit}${d.sub ? ` · ${d.sub}` : ''}`}>
              <span className="adm-bar__label">
                <span className="adm-bar__name">{d.label}</span>
                {d.sub && <small>{d.sub}</small>}
              </span>
              <span className="adm-bar__track" aria-hidden="true">
                <span className="adm-bar__fill" style={{ width: `${(d.value / max) * 100}%` }} />
              </span>
              <b className="adm-bar__value">
                {fmt(d.value)}
                {unit}
              </b>
            </Tag>
          </li>
        );
      })}
    </ol>
  );
}

/** Columns over time: [{ date: 'YYYY-MM-DD', value }]. Hover a column for its day. */
export function DayColumns({ data, label = 'per day', empty = 'No activity yet.' }) {
  const [hover, setHover] = useState(null);
  if (!data.length || data.every((d) => !d.value)) return <p className="adm-empty">{empty}</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((n, d) => n + d.value, 0);
  const shown = hover ?? data[data.length - 1];
  const nice = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <div className="adm-cols">
      <p className="adm-cols__readout">
        <b>{fmt(shown.value)}</b> {label} · {nice(shown.date)}
        <span>
          {fmt(total)} in {data.length} day{data.length === 1 ? '' : 's'}
        </span>
      </p>
      <div className="adm-cols__plot" role="img" aria-label={`${label}: ${data.map((d) => `${nice(d.date)} ${d.value}`).join(', ')}`}>
        {data.map((d) => (
          <button
            key={d.date}
            type="button"
            className={`adm-col ${hover?.date === d.date ? 'is-on' : ''}`}
            onMouseEnter={() => setHover(d)}
            onFocus={() => setHover(d)}
            onMouseLeave={() => setHover(null)}
            onBlur={() => setHover(null)}
            aria-label={`${nice(d.date)}: ${d.value}`}
          >
            <span style={{ height: `${Math.max(d.value ? 4 : 0, (d.value / max) * 100)}%` }} />
          </button>
        ))}
      </div>
      <p className="adm-cols__axis">
        <span>{nice(data[0].date)}</span>
        <span>{nice(data[data.length - 1].date)}</span>
      </p>
    </div>
  );
}

/** A two-part split as one bar with both parts labelled (e.g. Christites vs other colleges). */
export function Split({ data }) {
  const total = data.reduce((n, d) => n + d.value, 0);
  if (!total) return <p className="adm-empty">Nothing yet.</p>;
  return (
    <div className="adm-split">
      <div className="adm-split__bar" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.label} className={`adm-split__part adm-split__part--${i}`} style={{ flexGrow: d.value || 0.0001 }} title={`${d.label}: ${fmt(d.value)}`} />
        ))}
      </div>
      <ul className="adm-split__legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <i className={`adm-split__swatch adm-split__part--${i}`} aria-hidden="true" />
            {d.label}
            <b>{fmt(d.value)}</b>
            <small>{Math.round((d.value / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
