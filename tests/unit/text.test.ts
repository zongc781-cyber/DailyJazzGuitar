import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { barRuns, count, curly, listJoin, typeset } from '../../src/lib/text';

test('prose gets real accidentals on degrees and roman numerals, but chord symbols are left alone', () => {
  assert.equal(typeset('the b9 of the bVImaj7, the V7b9'), 'the ♭9 of the ♭VImaj7, the V7♭9');
  assert.equal(typeset('a #11 over (b3)'), 'a ♯11 over (♭3)');
  assert.equal(typeset('over Bb7 and Am7b5, then C7#9'), 'over Bb7 and Am7b5, then C7#9');
  assert.equal(typeset('the b7 of {{chord 1}} falls to {{note 2.3}}'), 'the ♭7 of {{chord 1}} falls to {{note 2.3}}');
});

test('prose gets curly quotes', () => {
  assert.equal(curly(`the 'and' of one in Hall's "Autumn Leaves"`), 'the ‘and’ of one in Hall’s “Autumn Leaves”');
  assert.equal(typeset(`Somethin' Else`), 'Somethin’ Else');
});

test('typesetting twice changes nothing more, and never touches a music token in the seed lessons', () => {
  const TOKEN = /\{\{[^}]*\}\}/g;
  const strings: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') strings.push(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  for (const dir of ['content/licks', 'content/standards']) {
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) walk(JSON.parse(readFileSync(join(dir, f), 'utf8')));
  }
  assert.ok(strings.length > 1000);
  for (const s of strings) {
    const once = typeset(s);
    assert.equal(typeset(once), once);
    assert.deepEqual(once.match(TOKEN), s.match(TOKEN));
  }
});

test('counts, lists and bar runs read as plain English', () => {
  assert.equal(count(1, 'recording'), '1 recording');
  assert.equal(count(4, 'recording'), '4 recordings');
  assert.equal(listJoin(['a', 'b', 'c']), 'a, b and c');
  assert.equal(barRuns([1, 2, 3, 9, 21, 22]), '1–3, 9 and 21–22');
});
