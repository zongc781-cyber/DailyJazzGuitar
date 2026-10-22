'use client';

import type { ReactNode } from 'react';
import { usePlayer, useScoreTarget } from './PlayerProvider';
import styles from './player.module.css';

/** The score and its playback bar, joined on one sheet of paper. */
export function ScoreSheet({ children }: { children: ReactNode }) {
  return <div className={styles.sheet}>{children}</div>;
}

/** The sheet alphaTab draws into: standard notation and tab for the current line. */
export function PlayerScore() {
  const { state, meta } = usePlayer();
  const attach = useScoreTarget();
  return (
    <div className={styles.paper}>
      <div ref={attach} className={styles.score} role="img" aria-label={meta.label} data-testid="score" />
      {state.error ? (
        <p className={styles.scoreError} role="alert">
          {state.error}
        </p>
      ) : !state.rendered ? (
        <div className={styles.scoreLoading} aria-hidden="true">
          <span>Drawing the notation…</span>
        </div>
      ) : null}
    </div>
  );
}
