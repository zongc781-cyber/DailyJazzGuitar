// Public entry point. The app's save path and the CLI both call validateForPublish, so a
// lesson that reaches users has passed exactly the same checks as the seed library.

import { validateLesson, Report } from './lesson.mjs';
import { transposeLick, tonicsFor, interval, compareTransposition, fingerprint } from './transpose.mjs';
import { lickToAlphaTex, barsToAlphaTex } from './alphatex.mjs';
import { roundTrip } from './roundtrip.mjs';
import { parsePitchClass } from './theory.mjs';

export * from './theory.mjs';
export * from './lesson.mjs';
export * from './transpose.mjs';
export * from './alphatex.mjs';
export { roundTrip, loadAlphaTab } from './roundtrip.mjs';

/**
 * Full publish gate.
 * @param lesson   parsed lesson JSON
 * @param options  {library: lessons already published, file, alphaTab: true to require the
 *                  alphaTab round trip (the app should pass true; the CLI skips it if missing)}
 * @returns Report with .ok, .errors, .warnings, and .notes (info lines)
 */
export async function validateForPublish(lesson, { library = [], file = '', alphaTab = false } = {}) {
  const r = validateLesson(lesson, file);
  r.notes = [];
  if (!r.ok) return r; // later checks assume a structurally valid lesson

  for (const other of library) {
    if (other.id === lesson.id && other !== lesson) r.error('id', `id "${lesson.id}" is already used`);
    if (lesson.kind === 'lick' && other.kind === 'lick' && other !== lesson && fingerprint(other) === fingerprint(lesson))
      r.error('bars', `same intervals and rhythm as lick "${other.id}" (a repeat, possibly transposed)`);
  }

  if (lesson.kind === 'lick') {
    await checkRender(lesson, r, alphaTab);
    checkAllKeys(lesson, r);
  } else {
    for (const [i, g] of lesson.guideToneExercises.entries()) {
      await checkLineRender(g.bars, g.chords, lesson, `guideToneExercises[${i}]`, r, alphaTab);
    }
  }
  return r;
}

async function checkRender(lick, r, requireAlphaTab) {
  for (const variation of [false, true]) {
    const path = variation ? 'variation' : 'bars';
    let tex;
    try { tex = lickToAlphaTex(lick, { variation }); } catch (e) { r.error(path, e.message); continue; }
    const bars = variation ? lick.variation.bars : lick.bars;
    const chords = variation ? (lick.variation.chords ?? lick.chords) : lick.chords;
    await reportRoundTrip(tex, bars, chords, lick, path, r, requireAlphaTab);
  }
}

async function checkLineRender(bars, chords, lesson, path, r, requireAlphaTab) {
  let body;
  try { body = barsToAlphaTex(bars, chords, lesson.timeSignature); } catch (e) { r.error(path, e.message); return; }
  const swing = lesson.feel === 'swing';
  const ts = lesson.timeSignature;
  const tex = `\\tempo ${lesson.tempo.default}\n.\n\\track "Guitar"\n\\staff {score tabs}\n` +
    body.map((b, i) => `${i === 0 ? `\\ts ${ts[0]} ${ts[1]} ` : ''}\\tf ${swing ? 'triplet8th' : 'none'} ${b}`).join(' |\n') + ' |';
  await reportRoundTrip(tex, bars, chords, lesson, path, r, requireAlphaTab);
}

async function reportRoundTrip(tex, bars, chords, lesson, path, r, requireAlphaTab) {
  const problems = await roundTrip(tex, bars, { swing: lesson.feel === 'swing', chords, ts: lesson.timeSignature });
  if (problems === null) {
    if (requireAlphaTab) r.error(path, 'alphaTab is not installed, so the render round trip could not run');
    else if (!r.notes.includes('alphaTab round trip skipped (install @coderline/alphatab to enable)')) r.notes.push('alphaTab round trip skipped (install @coderline/alphatab to enable)');
    return;
  }
  for (const p of problems) r.error(path, `alphaTab: ${p}`);
}

function checkAllKeys(lick, r) {
  const fromPc = parsePitchClass(lick.key.tonic).pc;
  for (const tonic of tonicsFor(lick.key.mode)) {
    if (parsePitchClass(tonic).pc === fromPc) continue;
    const t = transposeLick(lick, tonic);
    if (t.error) { r.error('transposition', `cannot transpose to ${tonic}: ${t.error}`); continue; }
    const tr = validateLesson(t.lesson);
    for (const e of tr.errors) r.error('transposition', `in ${tonic}: ${e.path} ${e.message}`);
    const { semis } = interval(lick.key.tonic, tonic);
    for (const p of compareTransposition(lick, t.lesson, semis)) r.error('transposition', `in ${tonic}: ${p}`);
  }
}

export { Report };
