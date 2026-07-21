import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createControlRoomStyle, normalizePointerPosition } from '../src/lib/controlRoomTheme';

describe('QuantumHive control room theme', () => {
  it('normalizes pointer coordinates into clamped percentages', () => {
    assert.deepEqual(normalizePointerPosition(50, 25, 200, 100), { x: 25, y: 25 });
    assert.deepEqual(normalizePointerPosition(-10, 150, 200, 100), { x: 0, y: 100 });
    assert.deepEqual(normalizePointerPosition(50, 50, 0, 0), { x: 50, y: 50 });
  });

  it('creates CSS variables used by the reactive control room background', () => {
    assert.deepEqual(createControlRoomStyle({ x: 12.5, y: 80 }), {
      '--qh-pointer-x': '12.5%',
      '--qh-pointer-y': '80%',
    });
  });
});
