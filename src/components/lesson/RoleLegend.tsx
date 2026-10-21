// Key to the analysis colours and fretboard shapes. Shape and colour both carry the role, so the
// analysis does not depend on colour vision.

import styles from './lesson.module.css';

const ITEMS = [
  { cls: 'chord', shape: 'circle', label: 'Chord tone' },
  { cls: 'tension', shape: 'diamond', label: 'Extension or tension' },
  { cls: 'approach', shape: 'ring', label: 'Approach, passing or neighbour' },
  { cls: 'scale', shape: 'square', label: 'Scale tone' },
  { cls: 'resolution', shape: 'circle', label: 'Resolution' },
] as const;

export function RoleLegend() {
  return (
    <ul className={styles.legend} aria-label="Analysis colours">
      {ITEMS.map((item) => (
        <li key={item.cls} className={styles[`role_${item.cls}`]}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            {item.shape === 'diamond' ? (
              <rect x="4" y="4" width="10" height="10" rx="1.5" transform="rotate(45 9 9)" fill="currentColor" />
            ) : item.shape === 'square' ? (
              <rect x="3" y="3" width="12" height="12" rx="2.5" fill="currentColor" />
            ) : item.shape === 'ring' ? (
              <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2.6" />
            ) : (
              <circle cx="9" cy="9" r="7" fill="currentColor" />
            )}
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
