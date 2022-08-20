import { Privilege } from '@prisma/client';
import { getPrivileges } from './authorize.controller.js';

jest.mock('../../query/application/privilege.query');
describe('Authorize controller test', () => {
  const defaultPrivileges = [Privilege.NONE, Privilege.MODIFY_RESOURCE];
  const applicationId = 1_000;
  const identitiesWithPrivilege = [
    [{ id: 999, role: [], group: [] }, defaultPrivileges],
    [
      {
        id: NaN,
        role: [{ applicationId, grant: [999] }],
        group: [],
      },
      defaultPrivileges,
    ],
    [{ id: NaN, role: [], group: [999] }, defaultPrivileges],
    [{ id: NaN, role: [], group: [] }, []],
  ] as const;
  it.each(identitiesWithPrivilege)(
    'The %# getPrivileges for identities %o works',
    async (identities, privileges) => {
      const p = await getPrivileges(applicationId, identities);
      expect([...p]).toEqual(privileges);
    }
  );
});
