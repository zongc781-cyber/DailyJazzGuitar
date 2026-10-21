#!/usr/bin/env node
// Validates every seed lesson with the publish gate (alphaTab round trip required) and bundles the
// seed library for the app as src/generated/seed-library.json. If any lesson fails, nothing is
// written and the command exits non-zero, so `dev`, `build` and `test` never run on a library that
// contains a failing lesson.
//
//   node scripts/build-library.mjs [--content <dir>]   (default: ./content)

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateForPublish } from '../src/lib/music/index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argIndex = process.argv.indexOf('--content');
const contentDir = argIndex > 0 ? resolve(process.argv[argIndex + 1]) : join(root, 'content');

function readLessons(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const file = join(dir, f);
      try {
        return { file, lesson: JSON.parse(readFileSync(file, 'utf8')) };
      } catch (e) {
        return { file, error: `not valid JSON: ${e.message}` };
      }
    });
}

const problems = [];
const rel = (file) => relative(root, file);
const curriculumFile = join(contentDir, 'curriculum.json');
const curriculum = existsSync(curriculumFile) ? JSON.parse(readFileSync(curriculumFile, 'utf8')) : { standards: [] };
const seedFiles = [...readLessons(join(contentDir, 'standards')), ...readLessons(join(contentDir, 'licks'))];
const generatedFiles = readLessons(join(contentDir, 'generated'));
for (const x of [...seedFiles, ...generatedFiles]) if (x.error) problems.push(`${rel(x.file)}: ${x.error}`);

const seed = seedFiles.filter((x) => x.lesson);
// Duplicates and repeats are checked against everything published, generated lessons included.
const library = [...seed, ...generatedFiles.filter((x) => x.lesson)].map((x) => x.lesson);

for (const { file, lesson } of seed) {
  const r = await validateForPublish(lesson, { library, file, alphaTab: true });
  for (const e of r.errors) problems.push(`${rel(file)}: ${e.path || '(root)'}: ${e.message}`);
  for (const w of r.warnings) console.warn(`warning ${rel(file)}: ${w.path || '(root)'}: ${w.message}`);
  if (lesson.origin !== 'seed') problems.push(`${rel(file)}: lessons in content/licks and content/standards must have origin "seed"`);
  const expectedKind = file.includes(`${'/'}licks${'/'}`) ? 'lick' : 'standard';
  if (lesson.kind !== expectedKind) problems.push(`${rel(file)}: a ${lesson.kind} lesson is in the ${expectedKind}s folder`);
  if (`${lesson.id}.json` !== file.split('/').pop()) problems.push(`${rel(file)}: file name must be the lesson id (${lesson.id}.json)`);
}

// Curriculum: every standard is scheduled once, and every seed lick belongs to exactly one standard.
const byId = new Map(seed.map((x) => [x.lesson.id, x.lesson]));
const licks = seed.map((x) => x.lesson).filter((l) => l.kind === 'lick');
const standards = seed.map((x) => x.lesson).filter((l) => l.kind === 'standard');
for (const id of curriculum.standards) if (byId.get(id)?.kind !== 'standard') problems.push(`curriculum.json: no seed standard "${id}"`);
for (const s of standards) if (!curriculum.standards.includes(s.id)) problems.push(`curriculum.json: standard "${s.id}" is not scheduled`);
const owner = new Map();
for (const s of standards) {
  for (const lickId of s.lickIds ?? []) {
    const lick = byId.get(lickId);
    if (lick?.kind !== 'lick') problems.push(`${s.id}: lickIds names "${lickId}", which is not a seed lick`);
    else if (lick.standardId !== s.id) problems.push(`${lickId}: standardId must be "${s.id}" (it is listed in that standard's lickIds)`);
    if (owner.has(lickId)) problems.push(`${lickId}: listed by both ${owner.get(lickId)} and ${s.id}`);
    owner.set(lickId, s.id);
  }
  for (const day of s.practicePlan ?? []) {
    if (day.lickId && !(s.lickIds ?? []).includes(day.lickId)) problems.push(`${s.id}: practice plan day ${day.day} points at "${day.lickId}", which is not one of its lickIds`);
  }
}
for (const l of licks) if (!owner.has(l.id)) problems.push(`${l.id}: not listed in any standard's lickIds`);

if (problems.length) {
  console.error(`seed library NOT built: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

// Curriculum order: each standard, then its licks in teaching order.
const ordered = [];
for (const id of curriculum.standards) {
  const s = byId.get(id);
  ordered.push(s);
  for (const lickId of s.lickIds ?? []) ordered.push(byId.get(lickId));
}
const outDir = join(root, 'src', 'generated');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'seed-library.json'), JSON.stringify({ schemaVersion: 1, lessons: ordered }) + '\n');
writeFileSync(join(outDir, 'generation-context.json'), JSON.stringify(generationContext()) + '\n');
console.log(`seed library built: ${standards.length} standard(s), ${licks.length} lick(s), all passed the publish gate`);

// The lesson format as the generator's prompt quotes it, taken from the jazz-lick-validator skill
// so the prompt and the validator cannot drift apart. Bundled here so the server never needs the
// skill folder at run time.
function generationContext() {
  const skill = join(root, '.claude', 'skills', 'jazz-lick-validator');
  const read = (...p) => readFileSync(join(skill, ...p), 'utf8').trim();
  const tokens = /## Writing analysis that survives transposition\n([\s\S]*?)\n## /.exec(read('SKILL.md'));
  if (!tokens) throw new Error('SKILL.md has no "Writing analysis that survives transposition" section for the generation prompt');
  const example = JSON.parse(read('examples', 'lick.example.json'));
  delete example.review;
  return {
    formatReference: read('references', 'lesson-format.md').replace(/^# .*\n+/, ''),
    contentRules: read('references', 'content-rules.md').replace(/^# .*\n+/, ''),
    tokenRules: tokens[1].trim(),
    exampleLick: { ...example, origin: 'generated', sources: [] },
  };
}
