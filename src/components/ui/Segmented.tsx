'use client';

import styles from './ui.module.css';

/** A row of mutually exclusive buttons (toggle buttons with aria-pressed). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={styles.segment} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
