'use client';

import ui from '@/components/ui/ui.module.css';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ maxWidth: 560, margin: '48px auto', display: 'grid', gap: 16 }} role="alert">
      <p className={ui.eyebrow}>Something went wrong</p>
      <h1>This page could not be shown</h1>
      <p>{error.digest ? `Reference ${error.digest}. ` : ''}Your progress is safe: it is stored in this browser.</p>
      <p>
        <button type="button" className={`${ui.button} ${ui.primary}`} onClick={reset}>
          Try again
        </button>
      </p>
    </div>
  );
}
