// Type declarations for theory.mjs (the implementation stays plain JS so the skill's CLI runs on Node).
export const LETTERS: readonly string[];
export const STANDARD_TUNING: Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, number>>;
export const STRING_NAMES: Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, string>>;
export const MAX_FRET: number;
export interface PitchClass { letter: string; acc: string; pc: number }
export interface Pitch extends PitchClass { octave: number; midi: number }
export function parsePitchClass(name: string | undefined | null): PitchClass | null;
export function parsePitch(name: string | undefined | null): Pitch | null;
export function fretToMidi(string: number, fret: number): number | null;
export function transposeSpelled(name: string, letterSteps: number, semitones: number): string | null;
export interface ChordQuality { family: string; tones: number[]; tensions: number[] }
export const CHORD_QUALITIES: Readonly<Record<string, ChordQuality>>;
export interface ParsedChord extends ChordQuality { root: string; rootPc: number; quality: string; bass: string | null }
export function parseChord(symbol: string | undefined | null): ParsedChord | null;
export function transposeChordSymbol(symbol: string, letterSteps: number, semitones: number): string | null;
export const DEGREES: Readonly<Record<string, number>>;
export function degreeSemitones(label: string | undefined): number | null;
export function isChordTone(chord: ChordQuality, semis: number): boolean;
export function isTensionLabel(label: string): boolean;
export const MAJOR_TONICS: readonly string[];
export const MINOR_TONICS: readonly string[];
export function parseRoman(roman: string, tonic: string): { rootPc: number; family: string } | null;
export function mod12(n: number): number;
