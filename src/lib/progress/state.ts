// The learner's progress, kept in this browser. One versioned object, so the shape can be migrated
// and one key is read and written. Nothing here is sent to the server.

export const STORAGE_KEY = 'djg:progress';
export const STATE_VERSION = 1;

export type NotationMode = 'score-tab' | 'tab' | 'score';
export type ThemePref = 'system' | 'light' | 'dark';

export interface Preferences {
  /** Show the analysis (degrees on the notes, colours and explanations) without pressing the button. */
  showAnalysis: boolean;
  countIn: boolean;
  metronome: boolean;
  loop: boolean;
  notation: NotationMode;
  leftHanded: boolean;
  theme: ThemePref;
  /** Starting tempo as a percentage of each lesson's default tempo. */
  startTempoPercent: number;
}

export interface DailyAssignment {
  lickId: string;
  standardId: string | null;
  /** ISO timestamp of the moment the lesson was assigned. */
  assignedAt: string;
  /** True when every lick had been used, so an earlier one is repeated on purpose. */
  review?: boolean;
}

export interface WeeklyAssignment {
  standardId: string;
  /** Local date the standard was first assigned for this week. */
  assignedOn: string;
  assignedAt: string;
  review?: boolean;
}

export interface LearnedEntry {
  kind: 'lick' | 'standard';
  title: string;
  learnedOn: string;
  origin: 'seed' | 'generated';
  artist?: string;
  /** The key the student was working in when they marked it learned. */
  key?: string;
}

export interface NoteEntry {
  text: string;
  updatedAt: string;
}

export interface ProgressState {
  version: typeof STATE_VERSION;
  daily: Record<string, DailyAssignment>;
  weekly: Record<string, WeeklyAssignment>;
  learned: Record<string, LearnedEntry>;
  favourites: Record<string, { addedOn: string }>;
  /** Practice checklist ticks: local date -> lesson id -> checklist item ids. */
  practice: Record<string, Record<string, string[]>>;
  /** Seven-day plan ticks: ISO week -> standard id -> "day.task" ids. */
  plan: Record<string, Record<string, string[]>>;
  notes: Record<string, NoteEntry>;
  prefs: Preferences;
}

export const DEFAULT_PREFS: Preferences = {
  showAnalysis: false,
  countIn: true,
  metronome: true,
  loop: true,
  notation: 'score-tab',
  leftHanded: false,
  theme: 'system',
  startTempoPercent: 100,
};

export function emptyState(): ProgressState {
  return { version: STATE_VERSION, daily: {}, weekly: {}, learned: {}, favourites: {}, practice: {}, plan: {}, notes: {}, prefs: { ...DEFAULT_PREFS } };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Accept stored data defensively: unknown or damaged parts fall back to defaults. */
export function migrate(raw: unknown): ProgressState {
  const base = emptyState();
  if (!isObj(raw)) return base;
  if (raw.version !== STATE_VERSION) return base; // only one version exists so far
  const pick = <K extends keyof ProgressState>(k: K): ProgressState[K] => (isObj(raw[k]) ? (raw[k] as ProgressState[K]) : base[k]);
  const prefs = isObj(raw.prefs) ? raw.prefs : {};
  return {
    version: STATE_VERSION,
    daily: pick('daily'),
    weekly: pick('weekly'),
    learned: pick('learned'),
    favourites: pick('favourites'),
    practice: pick('practice'),
    plan: pick('plan'),
    notes: pick('notes'),
    prefs: {
      showAnalysis: typeof prefs.showAnalysis === 'boolean' ? prefs.showAnalysis : DEFAULT_PREFS.showAnalysis,
      countIn: typeof prefs.countIn === 'boolean' ? prefs.countIn : DEFAULT_PREFS.countIn,
      metronome: typeof prefs.metronome === 'boolean' ? prefs.metronome : DEFAULT_PREFS.metronome,
      loop: typeof prefs.loop === 'boolean' ? prefs.loop : DEFAULT_PREFS.loop,
      notation: prefs.notation === 'tab' || prefs.notation === 'score' ? prefs.notation : 'score-tab',
      leftHanded: typeof prefs.leftHanded === 'boolean' ? prefs.leftHanded : DEFAULT_PREFS.leftHanded,
      theme: prefs.theme === 'light' || prefs.theme === 'dark' ? prefs.theme : 'system',
      startTempoPercent:
        typeof prefs.startTempoPercent === 'number' && prefs.startTempoPercent >= 40 && prefs.startTempoPercent <= 100
          ? Math.round(prefs.startTempoPercent)
          : DEFAULT_PREFS.startTempoPercent,
    },
  };
}
