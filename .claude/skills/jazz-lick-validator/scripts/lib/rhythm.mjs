// Exact rhythm arithmetic with fractions of a whole note.

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));

export class Frac {
  constructor(n, d = 1) {
    const g = gcd(n, d) || 1;
    const s = d < 0 ? -1 : 1;
    this.n = (s * n) / g;
    this.d = (s * d) / g;
  }
  add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Frac(this.n * o.n, this.d * o.d); }
  div(o) { return new Frac(this.n * o.d, this.d * o.n); }
  cmp(o) { return this.n * o.d - o.n * this.d; }
  eq(o) { return this.cmp(o) === 0; }
  isInt() { return this.d === 1; }
  valueOf() { return this.n / this.d; }
  toString() { return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`; }
}

export const DURATIONS = ['1', '2', '4', '8', '16', '32'];
export const TUPLETS = [3]; // triplets only; extend here if a lesson needs quintuplets

/** Nominal length (ignoring tuplet) of an event, as a fraction of a whole note. */
export function nominalLength(ev) {
  let len = new Frac(1, Number(ev.dur));
  let add = len;
  for (let i = 0; i < (ev.dots ?? 0); i++) {
    add = add.mul(new Frac(1, 2));
    len = len.add(add);
  }
  return len;
}

/** Sounding length: triplets play 3 in the time of 2. */
export function eventLength(ev) {
  const nom = nominalLength(ev);
  return ev.tuplet === 3 ? nom.mul(new Frac(2, 3)) : nom;
}

export function barLength([num, den]) {
  return new Frac(num, den);
}

/** Onset in quarter-note beats, 1-based (beat 1 = downbeat, 2.5 = "and of 2"). */
export function onsetToBeat(onset, [, den]) {
  return 1 + onset.valueOf() * den;
}
