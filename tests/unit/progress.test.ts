import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFS, STATE_VERSION, emptyState, migrate } from '../../src/lib/progress/state';

test('saved progress is read back, and bad or unknown values fall back to defaults', () => {
  const saved = {
    ...emptyState(),
    learned: { 'al-06-grant-green-riff': { kind: 'lick', title: 'Riff', learnedOn: '2026-10-21', origin: 'seed', key: 'B♭ major' } },
    prefs: { ...DEFAULT_PREFS, theme: 'dark', notation: 'tab', startTempoPercent: 300, countIn: 'yes' },
  };
  const state = migrate(JSON.parse(JSON.stringify(saved)));
  assert.equal(state.version, STATE_VERSION);
  assert.deepEqual(Object.keys(state.learned), ['al-06-grant-green-riff']);
  assert.equal(state.prefs.theme, 'dark');
  assert.equal(state.prefs.notation, 'tab');
  assert.equal(state.prefs.startTempoPercent, DEFAULT_PREFS.startTempoPercent);
  assert.equal(state.prefs.countIn, DEFAULT_PREFS.countIn);
});

test('anything that is not saved progress starts fresh', () => {
  assert.deepEqual(migrate(null), emptyState());
  assert.deepEqual(migrate('hello'), emptyState());
  assert.deepEqual(migrate({ version: 99, learned: { x: {} } }), emptyState());
});
