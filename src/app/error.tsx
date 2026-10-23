'use client';

import Link from 'next/link';
import { Hero } from '@/components/ui/Hero';
import ui from '@/components/ui/ui.module.css';
import styles from '@/components/screens/screens.module.css';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={styles.full} role="alert">
      <Hero
        top={
          <>
            <span>Error</span>
            {error.digest ? <span>Reference {error.digest}</span> : null}
          </>
        }
        title="This page hit a wrong note"
        actions={
          <>
            <button type="button" className={`${ui.button} ${ui.onField} ${ui.large}`} onClick={reset}>
              Try again
            </button>
            <Link href="/" className={styles.quietLink}>
              Back to Today
            </Link>
          </>
        }
      >
        <p>It stopped while it was being drawn, but your progress is safe in this browser.</p>
      </Hero>
    </div>
  );
}
