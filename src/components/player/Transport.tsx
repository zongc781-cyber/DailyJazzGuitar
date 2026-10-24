'use client';

import { useEffect, useId, type CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { usePlayer } from './PlayerProvider';
import styles from './player.module.css';

/**
 * The playback bar: play or pause, stop and the tempo, with no words. While the sounds load, the
 * bar's top line fills with blue; only a failure is written out. Loop, count-in and the metronome
 * are preferences (Progress).
 */
export function Transport({ onPlayed }: { onPlayed?: (bpm: number) => void }) {
  const { state, actions, meta } = usePlayer();
  const statusId = useId();
  const { min, max } = meta.tempo;
  const disabled = !state.audioReady;
  const loading = !state.audioReady && !state.error;
  const status = state.error
    ? 'Playback is unavailable.'
    : loading
      ? `Loading sounds… ${Math.round(state.soundProgress * 100)}%`
      : state.playing
        ? 'Playing'
        : 'Ready to play';

  // Space or K toggles playback when focus is not in a form control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
      if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        actions.playPause();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [actions]);

  const play = () => {
    if (!state.playing) onPlayed?.(state.bpm);
    actions.playPause();
  };

  return (
    <div
      className={styles.transport}
      role="group"
      aria-label="Playback"
      data-loading={loading}
      style={{ '--load': `${state.soundProgress * 100}%` } as CSSProperties}
    >
      <div className={styles.transportRow}>
        <button
          type="button"
          className={styles.playButton}
          onClick={play}
          disabled={disabled}
          aria-label={state.playing ? 'Pause' : 'Play'}
          aria-describedby={statusId}
          title={state.playing ? 'Pause (Space)' : 'Play (Space)'}
          data-playing={state.playing}
          data-testid="play"
        >
          <Icon name={state.playing ? 'pause' : 'play'} size={28} />
        </button>
        <button type="button" className={styles.roundButton} onClick={actions.stop} disabled={disabled} aria-label="Stop" title="Stop">
          <Icon name="stop" size={20} />
        </button>
        <input
          className={styles.slider}
          style={{ '--fill': `${((state.bpm - min) / Math.max(1, max - min)) * 100}%` } as CSSProperties}
          type="range"
          min={min}
          max={max}
          step={1}
          value={state.bpm}
          onChange={(e) => actions.setBpm(Number(e.target.value))}
          aria-label="Tempo"
          aria-valuetext={`${state.bpm} beats per minute`}
        />
        <output className={`${styles.tempoValue} num`} data-testid="bpm" aria-label={`${state.bpm} beats per minute`}>
          {state.bpm}
          <span aria-hidden="true"> BPM</span>
        </output>
      </div>
      <p id={statusId} className={state.error ? styles.playError : 'visually-hidden'} aria-live="polite">
        {status}
      </p>
    </div>
  );
}
