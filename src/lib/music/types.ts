// TypeScript view of the lesson format (schemaVersion 1). The format itself is defined by the
// jazz-lick-validator skill (references/lesson-format.md) and enforced by lesson.mjs; these
// types only describe it for the app.

export type Duration = '1' | '2' | '4' | '8' | '16' | '32';
export type Role =
  | 'chord-tone'
  | 'tension'
  | 'approach-chromatic'
  | 'approach-diatonic'
  | 'enclosure'
  | 'passing'
  | 'neighbor'
  | 'scale';
export type Finger = 0 | 1 | 2 | 3 | 4 | 'T';
export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6;

interface EventTiming {
  dur: Duration;
  dots?: 1 | 2;
  tuplet?: 3;
}

export interface RestEvent extends EventTiming {
  rest: true;
}

export interface NoteEvent extends EventTiming {
  rest?: undefined;
  string: GuitarString;
  fret: number;
  pitch: string;
  finger: Finger;
  degree?: string;
  role?: Role;
  tie?: boolean;
  technique?: 'h' | 'p' | 'sl';
  shift?: boolean;
}

export type LineEvent = RestEvent | NoteEvent;

export interface Bar {
  events: LineEvent[];
}

export interface ChordPlacement {
  symbol: string;
  bar: number;
  beat: number;
}

export interface LessonKey {
  tonic: string;
  mode: 'major' | 'minor';
}

export type SourceKind = 'recording' | 'book' | 'method' | 'website' | 'video' | 'lead-sheet';

export interface Source {
  title: string;
  kind: SourceKind;
  author?: string;
  url?: string;
  year?: number;
  detail?: string;
}

export interface Review {
  /** "reviewed" once a person has played the lesson through; until then "awaiting-play-through". */
  status: 'reviewed' | 'awaiting-play-through';
  reviewedBy: string;
  reviewedOn: string;
}

export interface GeneratorInfo {
  service: string;
  version: string;
  generatedAt: string;
}

interface LessonBase {
  schemaVersion: 1;
  id: string;
  title: string;
  origin: 'seed' | 'generated';
  review?: Review;
  generator?: GeneratorInfo;
  sources: Source[];
  simplified: boolean;
  simplificationNote?: string;
  key: LessonKey;
  timeSignature: [number, number];
  feel: 'swing' | 'straight';
  tempo: { min: number; default: number; max: number };
  tags?: string[];
}

export type AnalysisTopic = 'chord-tones' | 'tensions' | 'approach' | 'rhythm' | 'resolution';
export type NoteRef = [bar: number, event: number];

export interface AnalysisPoint {
  topic: AnalysisTopic;
  notes: NoteRef[];
  text: string;
  onsetBeats?: number[];
}

export interface Inspiration {
  type: 'transcription' | 'in-the-style-of' | 'original' | 'method-exercise';
  artist?: string;
  recording?: string;
  year?: number;
  at?: string;
  note?: string;
}

export interface Lick extends LessonBase {
  kind: 'lick';
  standardId?: string;
  inspiration: Inspiration;
  chords: ChordPlacement[];
  bars: Bar[];
  analysis: {
    summary: string;
    points: AnalysisPoint[];
    resolution: { note: NoteRef; degree: string; onsetBeat?: number };
  };
  whyItWorks: string;
  practiceTask?: string;
  fingeringNote?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  variation: {
    description: string;
    bars: Bar[];
    chords?: ChordPlacement[];
  };
}

export interface ChartChord {
  symbol: string;
  beat: number;
  roman: string;
  keyCenter?: string;
}

export interface VoicingNote {
  string: GuitarString;
  fret: number;
  finger: Finger;
  pitch: string;
  degree: string;
}

export interface Voicing {
  symbol: string;
  name?: string;
  notes: VoicingNote[];
  note?: string;
}

export interface GuideToneExercise {
  title: string;
  description?: string;
  chords: ChordPlacement[];
  bars: Bar[];
}

export type PlanFocus =
  | 'listening'
  | 'harmony'
  | 'comping'
  | 'arpeggios'
  | 'vocabulary'
  | 'improvisation'
  | 'self-review';

export interface PlanDay {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  focus: PlanFocus;
  minutes: number;
  tasks: string[];
  lickId?: string;
}

export interface ListeningLink {
  performer: string;
  recording: string;
  album?: string;
  year: number;
  url: string;
  verifiedOn: string;
  note?: string;
}

export interface Standard extends LessonBase {
  kind: 'standard';
  composers: string[];
  year: number;
  keyCenters: { tonic: string; mode: 'major' | 'minor'; bars: [number, number] }[];
  form: { label: string; bars?: number; sections: { label: string; bars: number }[] };
  chart: { chords: ChartChord[] }[];
  listening: ListeningLink[];
  analysis: {
    summary: string;
    sections?: { label: string; text: string }[];
    variations: { name: string; chords: { bar: number; beat: number; symbol: string; roman: string }[]; text: string }[];
  };
  voicings: Voicing[];
  guideToneExercises: GuideToneExercise[];
  improvisation: { title: string; text: string }[];
  practicePlan: PlanDay[];
  lickIds?: string[];
}

export type Lesson = Lick | Standard;

/** A published lesson plus when it entered the library. */
export interface PublishedLesson {
  lesson: Lesson;
  publishedAt: string;
}

/** Light catalogue entry the client uses for scheduling and the library list. */
export interface CatalogEntry {
  id: string;
  kind: 'lick' | 'standard';
  title: string;
  origin: 'seed' | 'generated';
  standardId?: string;
  lickIds?: string[];
  key: LessonKey;
  difficulty?: number;
  artist?: string;
  inspirationType?: Inspiration['type'];
  composers?: string[];
  simplified: boolean;
  tags: string[];
  publishedAt: string;
  /** Position in the seed curriculum; generated lessons come after the seed library. */
  order: number;
}
