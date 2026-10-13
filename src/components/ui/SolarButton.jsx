/** The solar-flare CTA: a gold pill with a cursor-tracked hot spot and rotating rays. Link if `href`, else a button. */
export default function SolarButton({ href, onClick, children, size = 'lg', className = '', ...rest }) {
  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--fx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--fy', `${e.clientY - rect.top}px`);
  };
  const Tag = href ? 'a' : 'button';
  return (
    <Tag
      href={href}
      type={href ? undefined : 'button'}
      onClick={onClick}
      onPointerMove={handleMove}
      className={`btn-solar ${size === 'sm' ? 'btn-solar--sm' : ''} ${className}`}
      {...rest}
    >
      <span className="btn-solar__flare" aria-hidden="true" />
      <span className="btn-solar__label">{children}</span>
    </Tag>
  );
}
