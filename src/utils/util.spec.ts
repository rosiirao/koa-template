import { nextId } from './util';

describe('util test', () => {
  it('nextId test start at its default value', () => {
    expect(nextId()).toBe(1);
    expect(nextId()).toBe(2);
    expect(nextId()).toBe(3);
    expect(nextId(2)).toBe(2);
    expect(nextId()).toBe(3);
  });
});
