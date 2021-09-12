import { hierarchyByName } from './query.shared';

describe('query lib shared test', () => {
  it('full name to hierarchy name array', () => {
    const name = 'test/beijing/root';
    expect(hierarchyByName(name)).toEqual([
      'root',
      'beijing/root',
      'test/beijing/root',
    ]);
  });
});
