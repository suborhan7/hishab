/** App mark: a rounded tile with a stylised taka sign. */
export function Logo({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <text
        x="32"
        y="45"
        textAnchor="middle"
        fontSize="38"
        fontWeight="700"
        fill="var(--accent-fg)"
        fontFamily="var(--font-hind), sans-serif"
      >
        ৳
      </text>
    </svg>
  );
}
