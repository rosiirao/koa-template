import { listRoles } from './role.query';

describe('role query test', () => {
  it('list role with start cursor', async () => {
    const applicationId = 1;
    const accCount = 50;
    let role = [] as typeof nextRole,
      nextRole = await listRoles(applicationId, 10);
    while (nextRole.length > 0) {
      role = role.concat(nextRole);
      nextRole = await listRoles(applicationId, accCount, {
        start: role.at(-1)!.id + 1,
      });
    }
    const roleWhole = await listRoles(applicationId, role.length + 10);

    expect(role).toEqual(roleWhole);
  });
});
