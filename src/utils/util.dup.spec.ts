import { nextId } from './util.js';

/**
 * nextId can start at 1 or a given value, and we can't test in one file for 2 cases.
 */
describe('util test', () => {
  it('nextId() start at a given value', () => {
    expect(nextId(5)).toBe(5);
    expect(nextId()).toBe(6);
    expect(nextId(1)).toBe(1);
    expect(nextId()).toBe(2);
    expect(nextId()).toBe(3);
    expect(nextId(2)).toBe(2);
    expect(nextId()).toBe(3);
  });
});
