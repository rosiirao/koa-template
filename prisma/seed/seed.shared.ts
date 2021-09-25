import { randomCharacter } from '../../src/utils';

export function getRandomArbitrary(max: number, min = 0): number {
  return Math.floor(Math.random() * (max - min) + min);
}

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
