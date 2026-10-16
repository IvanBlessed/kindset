/** Kindset mark: a golden-hour padel ball whose seam is a smile. */
export function Mark({ size = 32, ball = 'var(--ks-sun)', seam = '#fff' }: { size?: number; ball?: string; seam?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill={ball} />
      <path d="M17 42 Q50 88 83 42" fill="none" stroke={seam} strokeWidth="7.5" strokeLinecap="round" />
      <path d="M30 17 Q50 31 70 17" fill="none" stroke={seam} strokeWidth="5" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function Wordmark({ city }: { city?: string }) {
  return (
    <span className="ks-wordmark">
      <Mark size={26} />
      <span>kindset</span>
      {city && <span className="ks-wordmark__city">{city}</span>}
    </span>
  );
}
