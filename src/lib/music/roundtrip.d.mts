// Type declarations for roundtrip.mjs (Node only).
import type { Bar, ChordPlacement, LessonKey } from './types';
export function loadAlphaTab(fromDir?: string): Promise<unknown | null>;
export function roundTrip(tex: string, bars: Bar[], options: { swing: boolean; chords?: ChordPlacement[]; ts: [number, number]; key?: LessonKey; labels?: 'degrees' | null }): Promise<string[] | null>;
