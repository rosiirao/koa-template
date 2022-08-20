import { hierarchyByName, queryInput } from './query.shared.js';

describe('query lib shared test', () => {
  it('full name to hierarchy name array', () => {
    const name = 'test/beijing/root';
    expect(hierarchyByName(name)).toEqual([
      'root',
      'beijing/root',
      'test/beijing/root',
    ]);
  });
  it.each([
    [{ x: 1 }, 'input', { input: { x: 1 } }],
    [undefined, 'input', undefined],
  ])('query input works', (value, key, input) => {
    expect(queryInput(key, value)).toEqual(input);
  });
});
