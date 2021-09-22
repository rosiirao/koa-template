import { debounceAsyncExecutor, getRandomArbitrary } from '.';
import { nextId, sliceMap, rangeList, randomCharacter } from './util';

describe('util test', () => {
  it('nextId test start at its default value', () => {
    expect(nextId()).toBe(1);
    expect(nextId()).toBe(2);
    expect(nextId()).toBe(3);
    expect(nextId(2)).toBe(2);
    expect(nextId()).toBe(3);
  });

  it.each([
    [1_000, 20],
    [2_010, 50],
  ])('rangeList and sliceMap works', (listLength, size) => {
    // const listLength = 1_000;
    // const size = 20;
    const input = rangeList(listLength, () => randomCharacter());
    const output = sliceMap(input, size, (x) => x.length);
    const remainder = listLength % size;
    expect(input).toHaveLength(listLength);
    expect(output).toHaveLength(Math.ceil(listLength / size));
    expect(output).toEqual(
      new Array(Math.floor(listLength / size))
        .fill(size)
        .concat(remainder === 0 ? [] : remainder)
    );
  });

  it('debounce async executor works', async () => {
    const quota = 50;
    const rest = getRandomArbitrary(200);
    const executor = debounceAsyncExecutor<number>(quota);
    rangeList(quota, () =>
      executor.add(() => new Promise((r) => setTimeout(() => r(1), 500)))
    );
    rangeList(quota, () =>
      executor.add(() => new Promise((r) => setTimeout(() => r(2), 500)))
    );
    rangeList(rest, () => executor.add(() => Promise.resolve(1000)));
    const result = await executor.finish();
    const expected = new Array(50)
      .fill(1)
      .concat(new Array(50).fill(2))
      .concat(new Array(rest).fill(1000));
    expect(result).toEqual(expected);
    expect(() => executor.add(() => Promise.resolve(2))).toThrow('finish');
  });
});
