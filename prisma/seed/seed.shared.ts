import { randomArbitrary, randomCharacter, rangeList } from '../../src/utils';

export function getRandomArbitrary(max: number, min = 0): number {
  return Math.floor(Math.random() * (max - min) + min);
}

// randomly pick the roles to assign different privilege
export function randomPick<T>(
  list: Array<T>,
  count: number
): [got: Array<T>, rest: Array<T>] {
  if (count <= 0)
    throw new Error(`The number to pick must be positive, got (${count})`);
  if (count >= list.length) return [list, []];
  const got = [] as typeof list,
    rest = [...list];

  rangeList(count, () => {
    const index = randomArbitrary(rest.length);
    got.push(...rest.splice(index, 1));
  });
  return [got, rest];
}

export const SeedExecutorQuota = 50;

export { randomCharacter as randomName };

// function randomName_bak(mixin = ''): string {
//   const nanoid = customAlphabet(
//     'abcdefghijklmnopqrstuvwxyz' + mixin.replace(/[a-z]/gi, ''),
//     8
//   );

//   const min = getRandomArbitrary(4);
//   const max = getRandomArbitrary(8, 5);
//   try {
//     return nanoid().slice(min, max);
//   } catch (e) {
//     console.error(e);
//     return '';
//   }
// }
