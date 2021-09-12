import { groupListReady } from './seed.group';

describe('seed group', () => {
  it('generate group names list works', () => {
    const names = groupListReady(2, 6);
    console.log('generate group names:', names.length);
    expect(names.length).toBeGreaterThan(1000);
  });
});
