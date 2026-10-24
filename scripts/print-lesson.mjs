#!/usr/bin/env node
// Prints a lesson as plain text for a musical read-through: every note with its beat, string,
// fret, finger, degree and role, and every prose field with its tokens filled in, as the app
// shows them.
//
//   npm run print -- <lesson id or file> [--key Eb]     (--key transposes a lick first)

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eventLength, onsetToBeat, Frac } from '../src/lib/music/rhythm.mjs';
import { transposeLick } from '../src/lib/music/transpose.mjs';

const args = process.argv.slice(2);
const keyArg = args.indexOf('--key');
const toKey = keyArg >= 0 ? args[keyArg + 1] : null;
const target = args.find((a, i) => !a.startsWith('--') && (keyArg < 0 || i !== keyArg + 1));
if (!target) {
  console.error('usage: npm run print -- <lesson id or file> [--key Eb]');
  process.exit(2);
}
const file = target.endsWith('.json') ? target : ['standards', 'licks', 'generated'].map((d) => join('content', d, `${target}.json`)).find(existsSync);
if (!file) {
  console.error(`no lesson "${target}" in content/`);
  process.exit(2);
}
let lesson = JSON.parse(readFileSync(file, 'utf8'));
if (toKey) {
  if (lesson.kind !== 'lick') throw new Error('--key only applies to licks');
  const t = transposeLick(lesson, toKey);
  if (t.error) throw new Error(t.error);
  lesson = t.lesson;
}

const out = [];
const line = (s = '') => out.push(s);
const keyName = `${lesson.key.tonic} ${lesson.key.mode}`;

function fill(text, bars, chords) {
  return text.replace(/\{\{\s*(note|chord|key)\s*([\d.]*)\s*\}\}/g, (all, kind, ref) => {
    if (kind === 'key') return `[${keyName}]`;
    if (kind === 'chord') return `[${chords[Number(ref) - 1]?.symbol ?? `?chord ${ref}`}]`;
    const [b, e] = ref.split('.').map(Number);
    const ev = bars[b - 1]?.events[e - 1];
    return ev && !ev.rest ? `[${ev.pitch} @${b}.${e}]` : `[?note ${ref}]`;
  });
}

function printLine(bars, chords, ts) {
  const barLen = new Frac(ts[0], ts[1]);
  bars.forEach((bar, bi) => {
    const here = chords.filter((c) => c.bar === bi + 1).map((c) => `${c.symbol}${c.beat !== 1 ? ` (beat ${c.beat})` : ''}`);
    line(`  bar ${bi + 1}   ${here.join(', ')}`);
    let at = new Frac(0);
    bar.events.forEach((ev, ei) => {
      const beat = onsetToBeat(at, ts).toFixed(2).replace(/\.00$/, '');
      const dur = `${ev.dur}${'.'.repeat(ev.dots ?? 0)}${ev.tuplet ? ' (triplet)' : ''}`;
      const what = ev.rest
        ? 'rest'
        : `${ev.pitch.padEnd(4)} s${ev.string} f${String(ev.fret).padEnd(2)} finger ${ev.finger}  ${ev.tie ? 'tie' : `${(ev.degree ?? '').padEnd(3)} ${ev.role ?? ''}`}${ev.technique ? ` ${ev.technique}` : ''}${ev.shift ? ' shift' : ''}`;
      line(`    ${bi + 1}.${ei + 1}  beat ${beat.padEnd(5)} ${dur.padEnd(13)} ${what}`);
      at = at.add(eventLength(ev));
    });
    if (at.cmp(barLen) !== 0) line(`    (bar adds up to ${at} of ${barLen})`);
  });
}

line(`${lesson.title}  [${lesson.kind}, ${lesson.origin}, ${keyName}, ${lesson.feel}, ${lesson.timeSignature.join('/')}, ${lesson.tempo.min}-${lesson.tempo.max} bpm]`);

if (lesson.kind === 'lick') {
  const varChords = lesson.variation.chords ?? lesson.chords;
  const i = lesson.inspiration;
  line(`Inspiration: ${i.type}${i.artist ? `, ${i.artist}` : ''}${i.recording ? `, ${i.recording}` : ''}. ${i.note ?? ''}`);
  line();
  line('LICK');
  printLine(lesson.bars, lesson.chords, lesson.timeSignature);
  line();
  line(`Summary: ${fill(lesson.analysis.summary, lesson.bars, lesson.chords)}`);
  for (const p of lesson.analysis.points) line(`- ${p.topic} ${JSON.stringify(p.notes)}${p.onsetBeats ? ` beats ${p.onsetBeats.join(', ')}` : ''}: ${fill(p.text, lesson.bars, lesson.chords)}`);
  const r = lesson.analysis.resolution;
  line(`Resolution: note ${r.note.join('.')} (${r.degree})${r.onsetBeat ? ` on beat ${r.onsetBeat}` : ''}`);
  line();
  line(`Why this works: ${fill(lesson.whyItWorks, lesson.bars, lesson.chords)}`);
  if (lesson.fingeringNote) line(`Fingering: ${fill(lesson.fingeringNote, lesson.bars, lesson.chords)}`);
  if (lesson.practiceTask) line(`Practice task: ${fill(lesson.practiceTask, lesson.bars, lesson.chords)}`);
  line();
  line(`VARIATION: ${fill(lesson.variation.description, lesson.variation.bars, varChords)}`);
  printLine(lesson.variation.bars, varChords, lesson.timeSignature);
} else {
  const flat = lesson.chart.flatMap((b) => b.chords);
  line(`${lesson.composers.join(' and ')}, ${lesson.year}. Form ${lesson.form.label}: ${lesson.form.sections.map((s) => `${s.label} ${s.bars}`).join(', ')}`);
  line(`Key centres: ${lesson.keyCenters.map((k) => `${k.tonic} ${k.mode} ${k.bars.join('-')}`).join('; ')}`);
  line();
  line('CHART');
  lesson.chart.forEach((bar, i) => line(`  ${String(i + 1).padStart(2)}  ${bar.chords.map((c) => `${c.symbol}${c.beat !== 1 ? `@${c.beat}` : ''} (${c.roman}${c.keyCenter ? ` in ${c.keyCenter}` : ''})`).join('  ')}`));
  line();
  line(`Analysis: ${fill(lesson.analysis.summary, [], flat)}`);
  for (const s of lesson.analysis.sections ?? []) line(`- ${s.label}: ${fill(s.text, [], flat)}`);
  for (const v of lesson.analysis.variations) line(`- Variation "${v.name}" ${v.chords.map((c) => `${c.symbol}@${c.bar}.${c.beat} (${c.roman})`).join(' ')}: ${fill(v.text, [], v.chords)}`);
  line();
  line('VOICINGS');
  for (const v of lesson.voicings) line(`  ${v.symbol}${v.name ? ` (${v.name})` : ''}: ${[...v.notes].sort((a, b) => b.string - a.string).map((n) => `s${n.string} f${n.fret} ${n.pitch} ${n.degree} (finger ${n.finger})`).join(', ')}${v.note ? ` — ${v.note}` : ''}`);
  for (const g of lesson.guideToneExercises) {
    line();
    line(`GUIDE TONES: ${g.title}. ${fill(g.description ?? '', g.bars, g.chords)}`);
    printLine(g.bars, g.chords, lesson.timeSignature);
  }
  line();
  for (const idea of lesson.improvisation) line(`Idea "${idea.title}": ${fill(idea.text, [], flat)}`);
  line();
  for (const d of lesson.practicePlan) line(`Day ${d.day} ${d.focus} (${d.minutes} min)${d.lickId ? ` lick ${d.lickId}` : ''}: ${d.tasks.map((t) => fill(t, [], flat)).join(' | ')}`);
  line();
  for (const l of lesson.listening) line(`Listen: ${l.performer}, "${l.recording}"${l.album ? ` on ${l.album}` : ''} (${l.year}) ${l.url}`);
}
line();
for (const s of lesson.sources) line(`Source: [${s.kind}] ${s.title}${s.author ? `, ${s.author}` : ''}${s.year ? `, ${s.year}` : ''}${s.url ? ` ${s.url}` : ''}${s.detail ? ` — ${s.detail}` : ''}`);
if (lesson.simplified) line(`Simplified: ${lesson.simplificationNote}`);
console.log(out.join('\n'));
