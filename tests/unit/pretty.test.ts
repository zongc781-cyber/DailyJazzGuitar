import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prettyChord, prettyKey, prettyPitch, prettyRoman } from '../../src/lib/music/pretty';

test('pitches and chords are shown with real accidentals', () => {
  assert.equal(prettyPitch('Bb3'), 'B♭3');
  assert.equal(prettyPitch('F#4', { octave: false }), 'F♯');
  assert.equal(prettyPitch('Cbb2'), 'C𝄫2');
  assert.equal(prettyChord('Bbmaj7'), 'B♭maj7');
  assert.equal(prettyChord('G7b9'), 'G7♭9');
  assert.equal(prettyChord('Dm7b5'), 'Dm7♭5');
  assert.equal(prettyChord('C7#11'), 'C7♯11');
  assert.equal(prettyChord('F69'), 'F6/9');
  assert.equal(prettyChord('C7/Bb'), 'C7/B♭');
  assert.equal(prettyRoman('bVImaj7'), '♭VImaj7');
  assert.equal(prettyKey({ tonic: 'Eb', mode: 'major' }), 'E♭ major');
});
