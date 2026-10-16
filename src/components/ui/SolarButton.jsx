/**
 * The site's button: simple, with a single outer border.
 *   variant="primary" (default) — important actions: solid gold.
 *   variant="ghost" — everyday actions: light blue glass.
 *
 * `royal` is kept as a hook for page-specific tweaks; both skins look the same everywhere.
 *
 * Link if `href`, else a button. `size="sm"` for tight spots.
 */
// eslint-disable-next-line no-unused-vars
export default function SolarButton({ href, onClick, children, size = 'lg', variant = 'primary', royal = false, bare, className = '', ...rest }) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag
      href={href}
      type={href ? undefined : 'button'}
      onClick={onClick}
      className={`pbtn pbtn--${variant} ${royal ? 'pbtn--royal' : 'pbtn--plain'} ${size === 'sm' ? 'pbtn--sm' : ''} ${className}`}
      {...rest}
    >
      <span className="pbtn__sweep" aria-hidden="true" />
      <span className="pbtn__label">{children}</span>
    </Tag>
  );
}
