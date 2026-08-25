import test from 'node:test';
import assert from 'node:assert/strict';
import { GOAL_GEOMETRY, legalGoalCrossing } from '../src/goal-detection.js';

const radius = 24;

for (const mode of ['normal', 'recording']) {
  test(`${mode}: goal-line detection covers legal and illegal crossings`, async (t) => {
    const crossing = (previous, current) => legalGoalCrossing(previous, current, radius, GOAL_GEOMETRY);

    await t.test('A center shot scores', () => assert.equal(crossing({ x: 1600, y: 758 }, { x: 1740, y: 758 }), true));
    await t.test('B low legal shot scores', () => assert.equal(crossing({ x: 1630, y: 880 }, { x: 1720, y: 880 }), true));
    await t.test('C high legal shot scores', () => assert.equal(crossing({ x: 1630, y: 630 }, { x: 1720, y: 630 }), true));
    await t.test('D glancing legal crossing scores', () => assert.equal(crossing({ x: 1640, y: 620 }, { x: 1720, y: 660 }), true));
    await t.test('E shot above the crossbar is out', () => assert.equal(crossing({ x: 1600, y: 570 }, { x: 1740, y: 570 }), false));
    await t.test('F marble already behind/on top cannot become a goal', () => assert.equal(crossing({ x: 1700, y: 590 }, { x: 1780, y: 650 }), false));
    await t.test('G goalkeeper deflection back into play is not a goal', () => assert.equal(crossing({ x: 1680, y: 758 }, { x: 1640, y: 758 }), false));
    await t.test('H goalkeeper deflection that crosses the line scores', () => assert.equal(crossing({ x: 1680, y: 758 }, { x: 1692, y: 760 }), true));
    await t.test('I very slow crossing scores once', () => {
      assert.equal(crossing({ x: 1683.9, y: 758 }, { x: 1684.1, y: 758 }), true);
      assert.equal(crossing({ x: 1684.1, y: 758 }, { x: 1684.3, y: 758 }), false);
    });
    await t.test('J high-speed tunnelling crossing scores', () => assert.equal(crossing({ x: 1300, y: 758 }, { x: 1900, y: 758 }), true));
  });
}
