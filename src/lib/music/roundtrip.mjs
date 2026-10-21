// Optional check: parse the generated alphaTex with the real alphaTab importer and confirm
// every beat, pitch, string, fret, finger, spelling, chord name, the tuning, key signature,
// instrument and the swing setting survived.
// Runs when @coderline/alphatab is installed in the project; otherwise reports "skipped".

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { toAlphaTexFinger, toAlphaTexAccidental, toAlphaTexKeySignature, KEY_SIGNATURES, GUITAR_PROGRAM, degreeLabel } from './alphatex.mjs';
import { STANDARD_TUNING, fretToMidi } from './theory.mjs';

let alphaTabPromise;
export function loadAlphaTab(fromDir = process.cwd()) {
  alphaTabPromise ??= (async () => {
    try {
      const req = createRequire(pathToFileURL(fromDir + '/'));
      const entry = req.resolve('@coderline/alphatab');
      return await import(pathToFileURL(entry).href);
    } catch {
      return null;
    }
  })();
  return alphaTabPromise;
}

// alphaTab's NoteAccidentalMode values for the modes alphatex.mjs writes.
const ACCIDENTAL_MODE_VALUES = { forcenatural: 2, forcesharp: 3, forcedoublesharp: 4, forceflat: 5, forcedoubleflat: 6 };

/** Returns a list of mismatch messages, or null when alphaTab is not installed. */
export async function roundTrip(tex, bars, { swing, chords = [], ts, key, labels = null }) {
  const at = await loadAlphaTab();
  if (!at) return null;
  const problems = [];
  let score;
  try {
    const imp = new at.importer.AlphaTexImporter();
    imp.initFromString(tex, new at.Settings());
    score = imp.readScore();
  } catch (e) {
    return [`alphaTab could not parse the generated alphaTex: ${e.message}`];
  }
  const track = score.tracks[0];
  const staff = track.staves[0];
  if (track.playbackInfo.program !== GUITAR_PROGRAM) problems.push(`instrument is program ${track.playbackInfo.program}, not jazz guitar (${GUITAR_PROGRAM})`);
  const tuning = [1, 2, 3, 4, 5, 6].map((s) => STANDARD_TUNING[s]);
  if (staff.tuning.join(',') !== tuning.join(',')) problems.push(`tuning differs: ${staff.tuning.join(',')} vs standard ${tuning.join(',')}`);
  const ks = toAlphaTexKeySignature(key);
  if (ks) {
    const minor = ks.endsWith('minor');
    const want = KEY_SIGNATURES[minor ? 'minor' : 'major'][ks.slice(0, -'minor'.length)];
    staff.bars.forEach((b, i) => {
      if (b.keySignature !== want || b.keySignatureType !== (minor ? 1 : 0)) problems.push(`bar ${i + 1}: key signature differs (${b.keySignature}/${b.keySignatureType}, expected ${ks})`);
    });
  }
  if (staff.bars.length !== bars.length) problems.push(`alphaTab sees ${staff.bars.length} bars, lesson has ${bars.length}`);
  score.masterBars.forEach((mb, i) => {
    if (mb.tripletFeel !== (swing ? 2 : 0)) problems.push(`bar ${i + 1}: swing setting differs (tripletFeel ${mb.tripletFeel})`);
    if (mb.timeSignatureNumerator !== ts[0] || mb.timeSignatureDenominator !== ts[1]) problems.push(`bar ${i + 1}: time signature differs`);
  });
  const chordNames = [];
  bars.forEach((bar, bi) => {
    const beats = staff.bars[bi]?.voices[0].beats ?? [];
    if (beats.length !== bar.events.length) { problems.push(`bar ${bi + 1}: ${beats.length} beats parsed, ${bar.events.length} expected`); return; }
    bar.events.forEach((ev, ei) => {
      const b = beats[ei];
      const where = `bar ${bi + 1} event ${ei + 1}`;
      if (b.duration !== Number(ev.dur)) problems.push(`${where}: duration ${b.duration} vs ${ev.dur}`);
      if (b.dots !== (ev.dots ?? 0)) problems.push(`${where}: dots differ`);
      if ((ev.tuplet ?? -1) !== (b.tupletNumerator === -1 ? -1 : b.tupletNumerator)) problems.push(`${where}: tuplet differs`);
      if (b.chordId) chordNames.push(b.chord?.name ?? staff.getChord?.(b.chordId)?.name);
      if (ev.rest) { if (!b.isRest) problems.push(`${where}: expected a rest`); return; }
      const n = b.notes[0];
      if (!n) { problems.push(`${where}: note missing`); return; }
      if (n.string !== 7 - ev.string) problems.push(`${where}: string differs`);
      if (n.isTieDestination !== Boolean(ev.tie)) problems.push(`${where}: tie differs`);
      if (n.realValue !== fretToMidi(ev.string, ev.fret)) problems.push(`${where}: alphaTab plays MIDI ${n.realValue}, lesson says ${ev.pitch}`);
      if (!ev.tie && ev.fret > 0 && n.leftHandFinger !== toAlphaTexFinger(ev.finger) - 1) problems.push(`${where}: finger differs`);
      if (!ev.tie && n.accidentalMode !== ACCIDENTAL_MODE_VALUES[toAlphaTexAccidental(ev.pitch)]) problems.push(`${where}: spelling of ${ev.pitch} differs (accidental mode ${n.accidentalMode})`);
      if (labels === 'degrees' && !ev.tie && (b.text ?? null) !== degreeLabel(ev.degree)) problems.push(`${where}: degree label differs`);
    });
  });
  const want = chords.map((c) => c.symbol);
  if (chordNames.length && chordNames.join(' ') !== want.join(' ')) problems.push(`chord names differ: ${chordNames.join(' ')} vs ${want.join(' ')}`);
  return problems;
}
