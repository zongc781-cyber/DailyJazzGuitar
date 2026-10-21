'use client';

// One alphaTab instance: it draws the notation and tab for the current line and plays it with
// alphaTab's synthesizer, metronome, count-in and looping. Everything alphaTab shows or plays comes
// from the alphaTex the lesson JSON generates, so notation, tab and audio cannot disagree.
//
// Compound component: <PlayerProvider> owns the instance; <PlayerScore>, <Transport> and
// <Fretboard> read it through usePlayer() / useActiveNote().

import { createContext, use, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AlphaTabApi, model } from '@coderline/alphatab';
import { loadAlphaTab, ALPHATAB_BASE, type AlphaTab } from '@/lib/alphatab/load';
import { useProgress } from '@/lib/progress/store';
import { setPreference } from '@/lib/progress/actions';
import { cssVar, useResolvedTheme } from '@/lib/theme';
import type { NotationMode } from '@/lib/progress/state';
import type { Role } from '@/lib/music/types';

export interface NoteHighlight {
  role: Role | null;
  resolution?: boolean;
}

interface PlayerContextValue {
  state: {
    rendered: boolean;
    audioReady: boolean;
    soundProgress: number;
    playing: boolean;
    error: string | null;
    bpm: number;
  };
  settings: { loop: boolean; countIn: boolean; metronome: boolean };
  actions: {
    playPause: () => void;
    stop: () => void;
    setBpm: (bpm: number) => void;
    setLoop: (on: boolean) => void;
    setCountIn: (on: boolean) => void;
    setMetronome: (on: boolean) => void;
  };
  meta: { tempo: { min: number; default: number; max: number }; label: string };
}

const PlayerContext = createContext<PlayerContextValue | null>(null);
const ActiveNoteContext = createContext<{ bar: number; event: number } | null>(null);
// The element alphaTab draws into, attached by <PlayerScore> as a callback ref.
const ScoreTargetContext = createContext<(el: HTMLDivElement | null) => void>(() => {});

export function usePlayer(): PlayerContextValue {
  const ctx = use(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}

/** The note under the playback cursor (0-based bar and event), or null. */
export function useActiveNote() {
  return use(ActiveNoteContext);
}

/** Callback ref for the element the score is drawn into. */
export function useScoreTarget() {
  return use(ScoreTargetContext);
}

const STAVE: Record<NotationMode, number> = { 'score-tab': 1, score: 2, tab: 3 };

function scaleFor(width: number) {
  if (width < 420) return 0.88;
  if (width < 640) return 0.98;
  if (width < 900) return 1.08;
  return 1.18;
}

function themeResources() {
  return {
    staffLineColor: cssVar('--score-line'),
    barSeparatorColor: cssVar('--score-line'),
    barNumberColor: cssVar('--ink-3'),
    mainGlyphColor: cssVar('--score-ink'),
    secondaryGlyphColor: cssVar('--score-ink'),
    scoreInfoColor: cssVar('--score-ink'),
  };
}

const ROLE_VARS: Record<Role, string> = {
  'chord-tone': '--role-chord',
  tension: '--role-tension',
  'approach-chromatic': '--role-approach',
  'approach-diatonic': '--role-approach',
  enclosure: '--role-approach',
  passing: '--role-approach',
  neighbor: '--role-approach',
  scale: '--role-scale',
};

function colorize(at: AlphaTab, score: model.Score, highlights: NoteHighlight[][] | null) {
  if (!highlights) return;
  const { Color, NoteStyle, NoteSubElement, BeatStyle, BeatSubElement } = at.model;
  const parse = (hex: string) => Color.fromJson(hex);
  const staff = score.tracks[0]?.staves[0];
  staff?.bars.forEach((bar, bi) => {
    bar.voices[0]?.beats.forEach((beat, ei) => {
      const h = highlights[bi]?.[ei];
      if (!h || !h.role) return;
      const color = parse(cssVar(h.resolution ? '--role-resolution' : ROLE_VARS[h.role]));
      for (const note of beat.notes) {
        note.style = new NoteStyle();
        note.style.colors.set(NoteSubElement.StandardNotationNoteHead, color);
        note.style.colors.set(NoteSubElement.StandardNotationAccidentals, color);
        note.style.colors.set(NoteSubElement.GuitarTabFretNumber, color);
      }
      beat.style = new BeatStyle();
      beat.style.colors.set(BeatSubElement.Effects, color);
    });
  });
}

export function PlayerProvider({
  tex,
  tempo,
  label,
  highlights,
  children,
}: {
  tex: string;
  tempo: { min: number; default: number; max: number };
  /** Accessible name of the score, e.g. "Lick in B♭ major". */
  label: string;
  /** Per bar and event: the colour role to paint, when the analysis is shown. */
  highlights: NoteHighlight[][] | null;
  children: ReactNode;
}) {
  const prefs = useProgress((s) => s.prefs);
  const theme = useResolvedTheme();
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const atRef = useRef<AlphaTab | null>(null);
  const [rendered, setRendered] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [soundProgress, setSoundProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<{ bar: number; event: number } | null>(null);
  const startBpm = Math.min(tempo.max, Math.max(tempo.min, Math.round((tempo.default * prefs.startTempoPercent) / 100)));
  const [bpm, setBpmState] = useState(startBpm);

  // alphaTab calls these from its own events; effect events always see the latest props.
  const currentTex = useEffectEvent(() => tex);
  const onScoreLoaded = useEffectEvent((at: AlphaTab, score: model.Score) => colorize(at, score, highlights));
  const onPlayerReady = useEffectEvent((api: AlphaTabApi) => {
    api.playbackSpeed = bpm / tempo.default;
    api.isLooping = prefs.loop;
    api.countInVolume = prefs.countIn ? 1 : 0;
    api.metronomeVolume = prefs.metronome ? 1 : 0;
    setAudioReady(true);
  });
  const notationNow = useEffectEvent(() => prefs.notation);

  // Create the alphaTab instance once the score element exists.
  useEffect(() => {
    if (!element) return;
    let cancelled = false;
    let api: AlphaTabApi | null = null;
    loadAlphaTab()
      .then((at) => {
        if (cancelled) return;
        atRef.current = at;
        const width = element.clientWidth || 800;
        api = new at.AlphaTabApi(element, {
          // Lines are a few bars long, so draw them in full rather than as they scroll into view.
          core: { fontDirectory: `${ALPHATAB_BASE}font/`, logLevel: at.LogLevel.Warning, useWorkers: true, enableLazyLoading: false },
          display: {
            layoutMode: at.LayoutMode.Page,
            staveProfile: STAVE[notationNow()],
            scale: scaleFor(width),
            justifyLastSystem: false,
            padding: [8, 12, 8, 12],
            resources: themeResources(),
          },
          notation: {
            fingeringMode: at.FingeringMode.ScoreDefault,
            elements: new Map([
              [at.NotationElement.ScoreTitle, false],
              [at.NotationElement.GuitarTuning, false],
              [at.NotationElement.TrackNames, false],
              [at.NotationElement.EffectTempo, false],
              // Every note sounds at the same level, so the default forte marking says nothing.
              [at.NotationElement.EffectDynamics, false],
            ]),
          },
          player: {
            playerMode: at.PlayerMode.EnabledSynthesizer,
            soundFont: `${ALPHATAB_BASE}soundfont/sonivox.sf3`,
            scrollMode: at.ScrollMode.Off,
            enableCursor: true,
            enableAnimatedBeatCursor: true,
            enableElementHighlighting: true,
            enableUserInteraction: true,
          },
        });
        apiRef.current = api;
        api.scoreLoaded.on((score) => onScoreLoaded(at, score));
        api.renderStarted.on(() => setRendered(false));
        api.renderFinished.on(() => setRendered(true));
        api.soundFontLoad.on((e) => setSoundProgress(e.total ? e.loaded / e.total : 0));
        const created = api;
        api.playerReady.on(() => onPlayerReady(created));
        api.playerStateChanged.on((e) => setPlaying(e.state === 1));
        api.playedBeatChanged.on((beat) => setActive({ bar: beat.voice.bar.index, event: beat.index }));
        api.playerFinished.on(() => setActive(null));
        api.error.on((e) => setError(e.message || 'The score could not be drawn.'));
        api.tex(currentTex());
      })
      .catch(() => {
        if (!cancelled) setError('The notation engine could not be loaded. Check your connection and reload the page.');
      });
    return () => {
      cancelled = true;
      api?.destroy();
      apiRef.current = null;
    };
  }, [element]);

  // New line (transposed, variation, analysis labels): load it into the same instance. The
  // analysis colours change together with the labels, so the alphaTex is the only dependency.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.stop();
    setActive(null);
    api.tex(tex);
  }, [tex]);

  // Notation mode, theme and scale changes re-render the same score.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.settings.display.staveProfile = STAVE[prefs.notation];
    const res = themeResources();
    const at = atRef.current!;
    for (const [k, v] of Object.entries(res)) (api.settings.display.resources as unknown as Record<string, unknown>)[k] = at.model.Color.fromJson(v);
    api.updateSettings();
    // Re-colour role highlights with the new theme's colours before drawing.
    if (api.score) onScoreLoaded(at, api.score);
    api.render();
  }, [prefs.notation, theme]);

  useEffect(() => {
    if (!element) return;
    let bucket = scaleFor(element.clientWidth);
    const ro = new ResizeObserver(([entry]) => {
      const next = scaleFor(entry.contentRect.width);
      const api = apiRef.current;
      if (next === bucket || !api) return;
      bucket = next;
      api.settings.display.scale = next;
      api.updateSettings();
      api.render();
    });
    ro.observe(element);
    return () => ro.disconnect();
  }, [element]);

  useEffect(() => {
    const api = apiRef.current;
    if (api && audioReady) api.isLooping = prefs.loop;
  }, [prefs.loop, audioReady]);
  useEffect(() => {
    const api = apiRef.current;
    if (api && audioReady) api.countInVolume = prefs.countIn ? 1 : 0;
  }, [prefs.countIn, audioReady]);
  useEffect(() => {
    const api = apiRef.current;
    if (api && audioReady) api.metronomeVolume = prefs.metronome ? 1 : 0;
  }, [prefs.metronome, audioReady]);

  const playPause = useCallback(() => apiRef.current?.playPause(), []);
  const stop = useCallback(() => {
    apiRef.current?.stop();
    setActive(null);
  }, []);
  const setBpm = useCallback(
    (next: number) => {
      const clamped = Math.min(tempo.max, Math.max(tempo.min, Math.round(next)));
      setBpmState(clamped);
      const api = apiRef.current;
      if (api) api.playbackSpeed = clamped / tempo.default;
    },
    [tempo.min, tempo.max, tempo.default],
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      state: { rendered, audioReady, soundProgress, playing, error, bpm },
      settings: { loop: prefs.loop, countIn: prefs.countIn, metronome: prefs.metronome },
      actions: {
        playPause,
        stop,
        setBpm,
        setLoop: (on) => setPreference('loop', on),
        setCountIn: (on) => setPreference('countIn', on),
        setMetronome: (on) => setPreference('metronome', on),
      },
      meta: { tempo, label },
    }),
    [rendered, audioReady, soundProgress, playing, error, bpm, prefs.loop, prefs.countIn, prefs.metronome, playPause, stop, setBpm, tempo, label],
  );

  return (
    <PlayerContext value={value}>
      <ScoreTargetContext value={setElement}>
        <ActiveNoteContext value={active}>{children}</ActiveNoteContext>
      </ScoreTargetContext>
    </PlayerContext>
  );
}
