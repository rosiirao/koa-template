import { listRole } from './role.query';

describe('role query test', () => {
  it('list role with start cursor', async () => {
    const applicationId = 1;
    const accCount = 50;
    let role = [] as typeof nextRole,
      nextRole = await listRole(applicationId, 10);
    while (nextRole.length > 0) {
      role = role.concat(nextRole);
      nextRole = await listRole(applicationId, accCount, {
        start: role.at(-1)!.id + 1,
      });
    }
    const roleWhole = await listRole(applicationId, role.length + 10);

    expect(role).toEqual(roleWhole);
  });
});
