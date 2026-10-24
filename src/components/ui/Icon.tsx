// Small stroke icon set (24px grid). Decorative by default: pair with visible text or an aria-label
// on the control that contains it.

const PATHS = {
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" stroke="none" />,
  loop: (
    <>
      <path d="M17 2.5l3 3-3 3" />
      <path d="M4 11.5v-1a5 5 0 0 1 5-5h11" />
      <path d="M7 21.5l-3-3 3-3" />
      <path d="M20 12.5v1a5 5 0 0 1-5 5H4" />
    </>
  ),
  metronome: (
    <>
      <path d="M9.2 3.5h5.6l4.2 17H5z" />
      <path d="M12 16.5l5-10" />
      <path d="M7.5 15.5h9" />
    </>
  ),
  countIn: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9.5 2.5h5" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  heart: <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />,
  heartFilled: <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" fill="currentColor" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.8 12.3l3 3 5.4-6" />
    </>
  ),
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </>
  ),
  week: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 2.5V6M16 2.5V6" />
      <path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17h2" />
    </>
  ),
  library: (
    <>
      <path d="M4.5 4.5h3v15h-3zM9.5 4.5h3v15h-3z" />
      <path d="M14.5 5.3l2.9-.8 3.9 14.5-2.9.8z" />
    </>
  ),
  progress: (
    <>
      <path d="M4 20.5h16" />
      <path d="M6.5 17v-4M11 17V8.5M15.5 17v-6M20 17V5" />
    </>
  ),
  note: (
    <>
      <path d="M9 18.5V5.5l10-2v12" />
      <circle cx="6.5" cy="18.5" r="2.5" />
      <circle cx="16.5" cy="15.5" r="2.5" />
    </>
  ),
  external: (
    <>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5l-8 8" />
      <path d="M17 13.5v5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7h5" />
    </>
  ),
  chevronRight: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  arrowRight: <path d="M4 12h15.5M13.5 6l6 6-6 6" />,
  arrowDown: <path d="M12 4v15.5M6 13.5l6 6 6-6" />,
  chevronDown: <path d="M5.5 9.5L12 16l6.5-6.5" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17.4 17.4 0 0 1-3 3.8M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 4-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.5" />
    </>
  ),
  sparkle: <path d="M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-1.9z" />,
  book: (
    <>
      <path d="M4.5 5.5A2 2 0 0 1 6.5 3.5h13v15h-13a2 2 0 0 0-2 2z" />
      <path d="M4.5 20.5a2 2 0 0 1 2-2h13v2.5" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 18.5v-6a8 8 0 0 1 16 0v6" />
      <rect x="3.5" y="14.5" width="4" height="6" rx="1.5" />
      <rect x="16.5" y="14.5" width="4" height="6" rx="1.5" />
    </>
  ),
  pencil: (
    <>
      <path d="M15.5 4.5l4 4L8.5 19.5H4.5v-4z" />
      <path d="M13 7l4 4" />
    </>
  ),
  undo: (
    <>
      <path d="M8.5 5.5L4 10l4.5 4.5" />
      <path d="M4 10h10a5.5 5.5 0 0 1 0 11h-3" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      data-icon={name}
    >
      {PATHS[name]}
    </svg>
  );
}
