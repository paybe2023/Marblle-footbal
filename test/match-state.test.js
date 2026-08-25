import test from 'node:test';
import assert from 'node:assert/strict';
import { MATCH_CONFIG } from '../src/config.js';
import { MatchState } from '../src/match-state.js';

test('first and second teams qualify at target while qualified teams cannot score again', () => {
  const state = new MatchState(MATCH_CONFIG);
  for (let i = 0; i < 5; i++) state.score('france');
  assert.deepEqual(state.qualified, ['france']);
  assert.equal(state.isActive('france'), false);
  assert.equal(state.score('france').accepted, false);
  assert.equal(state.finished, false);
  for (let i = 0; i < 5; i++) state.score('senegal');
  assert.deepEqual(state.qualified, ['france', 'senegal']);
  assert.equal(state.finished, true);
});
