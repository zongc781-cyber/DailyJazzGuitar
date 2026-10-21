// Type declarations for transpose.mjs.
import type { Lick, LineEvent } from './types';
export function interval(fromTonic: string, toTonic: string): { letters: number; semis: number };
export function chooseShift(events: LineEvent[], semis: number): { shift: number; error?: undefined } | { error: string; shift?: undefined };
export function transposeLick<T extends Lick>(lick: T, toTonic: string): { lesson: T; shift: number; error?: undefined } | { error: string; lesson?: undefined; shift?: undefined };
export function tonicsFor(mode: 'major' | 'minor'): readonly string[];
export function fingerprint(lick: { bars?: { events: LineEvent[] }[] }): string;
export function compareTransposition(a: Lick, b: Lick, semis: number): string[];
