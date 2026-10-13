/** Four-point guiding star used as a bullet / ornament. */
export default function Star({ className = 'h-2 w-2' }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden="true">
      <path d="M6 0 l1.3 4.7 4.7 1.3 -4.7 1.3 -1.3 4.7 -1.3 -4.7 -4.7 -1.3 4.7 -1.3z" fill="currentColor" />
    </svg>
  );
}
