// Type declarations for rhythm.mjs.
export class Frac {
  constructor(n: number, d?: number);
  n: number;
  d: number;
  add(o: Frac): Frac;
  sub(o: Frac): Frac;
  mul(o: Frac): Frac;
  div(o: Frac): Frac;
  cmp(o: Frac): number;
  eq(o: Frac): boolean;
  isInt(): boolean;
  valueOf(): number;
  toString(): string;
}
export const DURATIONS: readonly string[];
export const TUPLETS: readonly number[];
type Timed = { dur: string; dots?: number; tuplet?: number };
export function nominalLength(ev: Timed): Frac;
export function eventLength(ev: Timed): Frac;
export function barLength(ts: [number, number] | number[]): Frac;
export function onsetToBeat(onset: Frac, ts: [number, number] | number[]): number;
