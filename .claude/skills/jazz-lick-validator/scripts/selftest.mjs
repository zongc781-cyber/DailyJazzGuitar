#!/usr/bin/env node
// Self-test: the examples must pass, and each deliberate mistake must be caught.
//   node selftest.mjs        (run from the project root so alphaTab is found if installed)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateForPublish, transposeLick, fingerprint } from './lib/index.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const lick = JSON.parse(readFileSync(here('../examples/lick.example.json'), 'utf8'));
const standard = JSON.parse(readFileSync(here('../examples/standard.example.json'), 'utf8'));

let failed = 0;
const pass = (name) => console.log(`ok    ${name}`);
const fail = (name, why) => { failed++; console.log(`FAIL  ${name}\n      ${why}`); };

async function expectPass(name, lesson) {
  const r = await validateForPublish(lesson, { library: [lick, standard] });
  r.ok ? pass(name) : fail(name, r.errors.map((e) => `${e.path}: ${e.message}`).join('\n      '));
}
async function expectError(name, base, mutate, needle) {
  const lesson = structuredClone(base);
  mutate(lesson);
  const r = await validateForPublish(lesson);
  const hit = r.errors.find((e) => `${e.path} ${e.message}`.includes(needle));
  hit ? pass(name) : fail(name, `expected an error containing "${needle}", got: ${r.errors.map((e) => e.message).join(' | ') || 'no errors'}`);
}

await expectPass('example lick passes', lick);
await expectPass('example standard passes', standard);

// Pitch and tuning
await expectError('wrong fret for written pitch', lick, (l) => { l.bars[0].events[1].fret = 6; }, 'sounds MIDI');
await expectError('string out of range', lick, (l) => { l.bars[0].events[1].string = 7; }, 'string must be');
// Rhythm
await expectError('bar too long', lick, (l) => { l.bars[0].events[0].dur = '4'; }, 'rhythm adds up');
await expectError('broken triplet', lick, (l) => { l.variation.bars[0].events[2].tuplet = undefined; l.variation.bars[0].events.push({ dur: '8', rest: true }); }, 'triplet');
// Analysis matches notes
await expectError('wrong degree label', lick, (l) => { l.bars[0].events[1].degree = '3'; }, 'not degree 3');
await expectError('chord tone that is not one', lick, (l) => { l.bars[0].events[6].role = 'chord-tone'; }, 'not a chord tone');
await expectError('approach that does not resolve by step', lick, (l) => { l.bars[1].events[7].role = 'approach-diatonic'; l.bars[2].events[0].role = 'scale'; }, 'chord tone or tension');
await expectError('analysis point mislabels a note', lick, (l) => { l.analysis.points[0].notes.push([1, 7]); }, 'called a chord tone');
await expectError('rhythm claim wrong', lick, (l) => { l.analysis.points[3].onsetBeats = [1, 1]; }, 'starts on beat 1.5');
await expectError('resolution degree wrong', lick, (l) => { l.analysis.resolution.degree = '5'; }, 'not 5');
await expectError('raw note name in prose', lick, (l) => { l.whyItWorks = 'Land on the Bb at the end.'; }, 'raw note or chord name');
await expectError('raw chord symbol in prose', lick, (l) => { l.analysis.summary = 'Outline Cm7 first.'; }, 'raw note or chord name');
await expectError('missing analysis topic', lick, (l) => { l.analysis.points = l.analysis.points.filter((p) => p.topic !== 'rhythm'); }, 'must cover "rhythm"');
// Playability
await expectError('fingers imply two positions', lick, (l) => { l.bars[0].events[2].finger = 1; l.bars[0].events[2].fret = 8; }, 'hand positions');
await expectError('same finger jumps frets', lick, (l) => { l.bars[0].events[3].finger = 4; }, 'jumps from fret');
await expectError('open string fingered', lick, (l) => { Object.assign(l.bars[0].events[1], { string: 3, fret: 0, pitch: 'G3', finger: 1 }); }, 'open strings take finger 0');
// Swing and format
await expectError('swing missing', lick, (l) => { delete l.feel; }, 'feel must be');
await expectError('per-lesson swing ratio rejected', lick, (l) => { l.swingRatio = 0.66; }, 'unknown field "swingRatio"');
await expectError('derived fretboard data rejected', lick, (l) => { l.fretboard = []; }, 'unknown field "fretboard"');
await expectError('chord change inside a note', lick, (l) => { l.chords.push({ symbol: 'Bbmaj9', bar: 3, beat: 1.5 }); }, 'middle of a note');
// Content rules
await expectError('generated lesson claiming transcription', lick, (l) => { l.origin = 'generated'; delete l.review; l.generator = { service: 'x', version: '1', generatedAt: '2026-10-21' }; l.inspiration = { type: 'transcription', artist: 'Wes Montgomery', recording: 'X' }; }, 'cannot claim to be a transcription');
await expectError('transcription without recording source', lick, (l) => { l.inspiration = { type: 'transcription', artist: 'Wes Montgomery', recording: 'Four on Six' }; }, 'cite the recording');
await expectError('simplified not stated', lick, (l) => { delete l.simplified; }, 'simplified must be');
await expectError('seed without review', lick, (l) => { delete l.review; }, 'seed lessons need review');
// Transposition
await expectError('open string blocks transposition', lick, (l) => { Object.assign(l.bars[3].events[0], { tie: undefined, string: 2, fret: 0, pitch: 'B3', finger: 0, degree: 'b9', role: 'scale' }); }, 'open strings');
const up = transposeLick(lick, 'E');
up.error || fingerprint(up.lesson) !== fingerprint(lick) ? fail('transposition keeps intervals', up.error ?? 'fingerprint changed') : pass('transposition keeps intervals');
// Standards
await expectError('plan missing a focus', standard, (s) => { s.practicePlan[2].focus = 'harmony'; }, 'missing comping');
await expectError('chart shorter than form', standard, (s) => { s.chart.pop(); }, 'one entry per bar');
await expectError('wrong roman numeral', standard, (s) => { s.chart[0].chords[0].roman = 'IV7'; }, 'does not have root');
await expectError('roman quality mismatch', standard, (s) => { s.chart[1].chords[0].roman = 'v7'; }, 'implies a min chord');
await expectError('unverified listening link', standard, (s) => { delete s.listening[0].verifiedOn; }, 'verifiedOn');
await expectError('voicing pitch wrong', standard, (s) => { s.voicings[0].notes[1].fret = 6; }, 'sounds MIDI');
await expectError('guide tone degree wrong', standard, (s) => { s.guideToneExercises[0].bars[0].events[0].degree = '3'; }, 'not degree 3');
// Library
{
  const copy = transposeLick(lick, 'D').lesson;
  copy.id = 'copy';
  const r = await validateForPublish(copy, { library: [lick] });
  r.errors.some((e) => e.message.includes('same intervals and rhythm')) ? pass('transposed copy flagged as repeat') : fail('transposed copy flagged as repeat', 'not flagged');
}

console.log(failed ? `\n${failed} self-test(s) failed` : '\nall self-tests passed');
process.exit(failed ? 1 : 0);
