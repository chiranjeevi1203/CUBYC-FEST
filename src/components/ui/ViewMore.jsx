import { useRef, useState } from 'react';

/**
 * "View more" for long card lists on smaller screens. On phones / tablets only the
 * first `limit` items show (the rest get .vm-extra, hidden by CSS below the
 * breakpoint); the button reveals them. On wide screens everything shows and the
 * button is hidden, so desktop layouts are untouched.
 *
 *   const vm = useViewMore(items.length, 4);
 *   items.map((it, i) => <li className={vm.cls(i)} …/>)
 *   <ViewMoreButton {...vm} />
 *
 * `bp` picks the breakpoint: 'md' (below 768px, default) or 'lg' (below 1024px).
 */
export function useViewMore(total, limit, bp = 'md') {
  const [open, setOpen] = useState(false);
  const extra = Math.max(0, total - limit);
  return {
    open,
    extra,
    bp,
    toggle: () => setOpen((v) => !v),
    cls: (i) => (!open && i >= limit ? `vm-extra vm-extra--${bp}` : ''),
  };
}

export function ViewMoreButton({ open, extra, bp, toggle, label = 'View more' }) {
  const row = useRef(null);
  if (!extra) return null;
  const onClick = () => {
    toggle();
    // Collapsing pulls the list up from under the reader: bring the button back into view.
    if (open) requestAnimationFrame(() => row.current?.scrollIntoView({ block: 'center' }));
  };
  return (
    <div ref={row} className={`vm-row vm-row--${bp}`}>
      <button type="button" className="vm-btn" onClick={onClick} aria-expanded={open}>
        <span>{open ? 'Show less' : `${label} · ${extra}`}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true" className={open ? 'is-up' : ''}>
          <path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
