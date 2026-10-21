'use client';

import { useEffect, useId } from 'react';
import { Icon } from '@/components/ui/Icon';
import { usePlayer } from './PlayerProvider';
import styles from './player.module.css';

const PRESETS = [
  { label: 'Slow', percent: 60 },
  { label: 'Practice', percent: 80 },
  { label: 'Target', percent: 100 },
];

/** Large playback controls: play, stop, tempo, loop, count-in and metronome. */
export function Transport({ onPlayed }: { onPlayed?: (bpm: number) => void }) {
  const { state, settings, actions, meta } = usePlayer();
  const tempoId = useId();
  const statusId = useId();
  const { min, max } = meta.tempo;
  const disabled = !state.audioReady;

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
    <div className={styles.transport} role="group" aria-label="Playback">
      <div className={styles.mainControls}>
        <button
          type="button"
          className={styles.playButton}
          onClick={play}
          disabled={disabled}
          aria-label={state.playing ? 'Pause' : 'Play'}
          aria-describedby={statusId}
          data-testid="play"
        >
          <Icon name={state.playing ? 'pause' : 'play'} size={30} />
        </button>
        <button type="button" className={styles.roundButton} onClick={actions.stop} disabled={disabled} aria-label="Stop">
          <Icon name="stop" size={22} />
        </button>
        <div className={styles.status} id={statusId} aria-live="polite">
          {state.error
            ? 'Playback unavailable'
            : state.audioReady
              ? state.playing
                ? 'Playing'
                : 'Ready to play'
              : `Loading sounds… ${Math.round(state.soundProgress * 100)}%`}
        </div>
      </div>

      <div className={styles.tempo}>
        <div className={styles.tempoHeader}>
          <label htmlFor={tempoId} className={styles.tempoLabel}>
            Tempo
          </label>
          <output htmlFor={tempoId} className={`${styles.tempoValue} num`} data-testid="bpm">
            {state.bpm}
            <span> BPM</span>
          </output>
        </div>
        <div className={styles.tempoRow}>
          <button type="button" className={styles.stepButton} onClick={() => actions.setBpm(state.bpm - 5)} aria-label="Slower by 5 BPM" disabled={state.bpm <= min}>
            <Icon name="minus" />
          </button>
          <input
            id={tempoId}
            className={styles.slider}
            type="range"
            min={min}
            max={max}
            step={1}
            value={state.bpm}
            onChange={(e) => actions.setBpm(Number(e.target.value))}
            aria-valuetext={`${state.bpm} beats per minute`}
          />
          <button type="button" className={styles.stepButton} onClick={() => actions.setBpm(state.bpm + 5)} aria-label="Faster by 5 BPM" disabled={state.bpm >= max}>
            <Icon name="plus" />
          </button>
        </div>
        <div className={styles.presets}>
          {PRESETS.map((p) => {
            const bpm = Math.min(max, Math.max(min, Math.round((meta.tempo.default * p.percent) / 100)));
            return (
              <button key={p.label} type="button" className={styles.preset} aria-pressed={state.bpm === bpm} onClick={() => actions.setBpm(bpm)}>
                {p.label} <span className="num">{bpm}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.toggles}>
        <button type="button" className={styles.toggle} aria-pressed={settings.loop} onClick={() => actions.setLoop(!settings.loop)}>
          <Icon name="loop" />
          <span>Loop</span>
        </button>
        <button type="button" className={styles.toggle} aria-pressed={settings.countIn} onClick={() => actions.setCountIn(!settings.countIn)}>
          <Icon name="countIn" />
          <span>Count-in</span>
        </button>
        <button type="button" className={styles.toggle} aria-pressed={settings.metronome} onClick={() => actions.setMetronome(!settings.metronome)}>
          <Icon name="metronome" />
          <span>Metronome</span>
        </button>
      </div>
    </div>
  );
}
