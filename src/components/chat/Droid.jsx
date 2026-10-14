import { useId } from 'react';

/**
 * CB-27, the CUBYC astromech droid (an original design in the classic astromech
 * style), as a compact dome avatar for the chat header and messages: a silver
 * dome with blue panels, a radar eye and a blinking process-state light.
 */
export function DroidHead({ className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-d`} cx="38%" cy="28%" r="80%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.5" stopColor="#cfd4de" />
          <stop offset="1" stopColor="#7a8191" />
        </radialGradient>
      </defs>
      <path d="M4 40 A28 28 0 0 1 60 40 Z" fill={`url(#${id}-d)`} stroke="#5b6273" strokeWidth="0.8" />
      <rect x="25" y="16" width="12" height="11" rx="1.5" fill="#2747b8" />
      <circle cx="31" cy="21.5" r="4" fill="#06080f" />
      <circle cx="29.8" cy="20.3" r="1" fill="#fff" />
      <rect x="9" y="30" width="8" height="6" fill="#2747b8" />
      <rect x="20" y="30" width="6" height="7" fill="#2747b8" />
      <circle cx="33" cy="33" r="2.4" className="droid__psi" />
      <circle cx="42" cy="33" r="3" fill="#d4d8e0" stroke="#5b6273" strokeWidth="0.6" />
      <rect x="48" y="30" width="8" height="6" fill="#2747b8" />
      <rect x="4" y="38" width="56" height="3" fill="#b9bfcb" />
    </svg>
  );
}
