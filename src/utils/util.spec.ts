import { nextId } from './util';

describe('util test', () => {
  test('nextId test', () => {
    expect(nextId()).toBe(1);
    expect(nextId()).toBe(2);
    expect(nextId()).toBe(3);
    expect(nextId(2)).toBe(2);
    expect(nextId()).toBe(3);
  });
});
