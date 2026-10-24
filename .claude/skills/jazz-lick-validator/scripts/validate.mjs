#!/usr/bin/env node
// Validate lesson JSON files before they are saved or published.
//   node validate.mjs <file-or-dir>... [--json] [--check-links] [--require-alphatab]
// Exit code 0 = every lesson passed, 1 = at least one error, 2 = bad usage.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { validateForPublish } from '../../../../src/lib/music/index.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const targets = args.filter((a) => !a.startsWith('--'));
if (targets.length === 0) {
  console.error('usage: node validate.mjs <file-or-dir>... [--json] [--check-links] [--require-alphatab]');
  process.exit(2);
}

function collect(p) {
  if (statSync(p).isDirectory()) {
    return readdirSync(p).filter((n) => n !== 'node_modules' && !n.startsWith('.')).flatMap((n) => collect(join(p, n)));
  }
  return p.endsWith('.json') ? [p] : [];
}

const files = targets.flatMap(collect);
const lessons = [];
const results = [];
for (const file of files) {
  try {
    lessons.push({ file, lesson: JSON.parse(readFileSync(file, 'utf8')) });
  } catch (e) {
    results.push({ file, errors: [{ path: '', message: `not valid JSON: ${e.message}` }], warnings: [], notes: [] });
  }
}
const library = lessons.map((x) => x.lesson);

for (const { file, lesson } of lessons) {
  const r = await validateForPublish(lesson, { library, file, alphaTab: flags.has('--require-alphatab') });
  if (r.ok && lesson.kind === 'lick' && lesson.standardId && !library.some((l) => l.kind === 'standard' && l.id === lesson.standardId))
    r.warn('standardId', `no standard "${lesson.standardId}" in the files checked`);
  if (r.ok && flags.has('--check-links')) await checkLinks(lesson, r);
  results.push({ file, id: lesson.id, kind: lesson.kind, origin: lesson.origin, errors: r.errors, warnings: r.warnings, notes: r.notes ?? [] });
}

async function checkLinks(lesson, r) {
  const urls = [...(lesson.listening ?? []), ...(lesson.sources ?? [])].map((x) => x.url).filter(Boolean);
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow' });
      if (res.status >= 400) r.error('links', `${url} returned HTTP ${res.status}`);
    } catch (e) {
      r.error('links', `${url} could not be fetched: ${e.message}`);
    }
  }
}

if (flags.has('--json')) {
  console.log(JSON.stringify(results, null, 2));
} else {
  const notes = new Set();
  for (const res of results) {
    const status = res.errors.length ? 'FAIL' : 'PASS';
    console.log(`${status} ${res.file}${res.id ? ` (${res.kind} ${res.id}, ${res.origin})` : ''}`);
    for (const e of res.errors) console.log(`  error   ${e.path || '(root)'}: ${e.message}`);
    for (const w of res.warnings) console.log(`  warning ${w.path || '(root)'}: ${w.message}`);
    res.notes.forEach((n) => notes.add(n));
  }
  for (const n of notes) console.log(`note: ${n}`);
  const failed = results.filter((x) => x.errors.length).length;
  console.log(`\n${results.length - failed}/${results.length} lessons passed`);
}
process.exit(results.some((x) => x.errors.length) ? 1 : 0);
