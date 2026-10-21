// Type declarations for alphatex.mjs.
import type { Bar, ChordPlacement, Lick, LessonKey } from './types';
export type LabelMode = 'degrees' | null;
export function toAlphaTexFinger(finger: number | 'T'): number;
export function toAlphaTexAccidental(pitch: string): string | null;
export const KEY_SIGNATURES: { major: Record<string, number>; minor: Record<string, number> };
export function toAlphaTexKeySignature(key: LessonKey | undefined | null): string | null;
export function degreeLabel(degree: string): string;
export function barsToAlphaTex(bars: Bar[], chords: ChordPlacement[], ts: [number, number], options?: { labels?: LabelMode }): string[];
export const GUITAR_PROGRAM: number;
export interface LineSpec {
  title?: string;
  bars: Bar[];
  chords: ChordPlacement[];
  timeSignature: [number, number];
  feel: 'swing' | 'straight';
  tempo: number;
  key?: LessonKey;
}
export function lineToAlphaTex(line: LineSpec, options?: { labels?: LabelMode }): string;
export function lickToAlphaTex(lick: Lick, options?: { variation?: boolean; labels?: LabelMode }): string;
