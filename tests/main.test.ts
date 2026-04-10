import { describe, it, expect } from 'vitest';

describe('project scaffold', () => {
  it('passes a sample test', () => {
    expect(1 + 1).toBe(2);
  });

  it('has correct logical dimensions', () => {
    const LOGICAL_WIDTH = 256;
    const LOGICAL_HEIGHT = 224;
    expect(LOGICAL_WIDTH).toBe(256);
    expect(LOGICAL_HEIGHT).toBe(224);
  });
});
