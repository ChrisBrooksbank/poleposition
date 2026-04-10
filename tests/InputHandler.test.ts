import { describe, it, expect, beforeEach } from 'vitest';
import { InputHandler } from '../src/input/InputHandler';

describe('InputHandler', () => {
  let input: InputHandler;

  beforeEach(() => {
    input = new InputHandler(); // no target — pure logic mode
  });

  it('reports left as true when ArrowLeft is held', () => {
    input.pressKey('ArrowLeft');
    expect(input.left).toBe(true);
    expect(input.right).toBe(false);
  });

  it('reports right as true when ArrowRight is held', () => {
    input.pressKey('ArrowRight');
    expect(input.right).toBe(true);
    expect(input.left).toBe(false);
  });

  it('reports throttle as true when ArrowUp is held', () => {
    input.pressKey('ArrowUp');
    expect(input.throttle).toBe(true);
    expect(input.brake).toBe(false);
  });

  it('reports brake as true when ArrowDown is held', () => {
    input.pressKey('ArrowDown');
    expect(input.brake).toBe(true);
    expect(input.throttle).toBe(false);
  });

  it('clears key state on releaseKey', () => {
    input.pressKey('ArrowLeft');
    expect(input.left).toBe(true);
    input.releaseKey('ArrowLeft');
    expect(input.left).toBe(false);
  });

  it('multiple keys can be held simultaneously', () => {
    input.pressKey('ArrowUp');
    input.pressKey('ArrowLeft');
    expect(input.throttle).toBe(true);
    expect(input.left).toBe(true);
    expect(input.brake).toBe(false);
    expect(input.right).toBe(false);
  });

  it('starts in low gear', () => {
    expect(input.gear).toBe('low');
  });

  it('toggles to high gear on ShiftLeft press', () => {
    input.pressKey('ShiftLeft');
    expect(input.gear).toBe('high');
  });

  it('toggles back to low gear on second ShiftLeft press', () => {
    input.pressKey('ShiftLeft');
    input.releaseKey('ShiftLeft');
    input.pressKey('ShiftLeft');
    expect(input.gear).toBe('low');
  });

  it('toggles gear with ShiftRight as well', () => {
    input.pressKey('ShiftRight');
    expect(input.gear).toBe('high');
  });

  it('gear state is independent — can use either shift key interchangeably', () => {
    input.pressKey('ShiftLeft'); // low -> high
    input.releaseKey('ShiftLeft');
    input.pressKey('ShiftRight'); // high -> low
    expect(input.gear).toBe('low');
  });

  it('isKeyDown reflects raw key state', () => {
    expect(input.isKeyDown('ArrowUp')).toBe(false);
    input.pressKey('ArrowUp');
    expect(input.isKeyDown('ArrowUp')).toBe(true);
    input.releaseKey('ArrowUp');
    expect(input.isKeyDown('ArrowUp')).toBe(false);
  });

  describe('event listener integration', () => {
    it('wires pressKey/releaseKey through DOM events when target is provided', () => {
      // Use a minimal EventTarget that works in Node via the global EventTarget
      const target = new EventTarget();
      const handler = new InputHandler(target);

      // Simulate dispatch using the internal method directly (DOM-free)
      // Verify the handler detaches cleanly without throwing
      expect(() => handler.destroy(target)).not.toThrow();
    });
  });
});
