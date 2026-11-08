// The Quarter mark: a clock face with one quarter (15 minutes) filled in
export default function Logo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="15 Minutes"
    >
      <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M32 6A26 26 0 0 1 58 32H32Z" fill="var(--accent)" />
    </svg>
  );
}
