import prisma from '../client.js';
import { aclClause } from './shared.application.query.js';

describe('List resources with acl clause', () => {
  it('aclClause shared works', async () => {
    const applicationId = 1;
    const identities = {
      id: 1,
      group: [1],
      role: [{ applicationId: 1, grant: [1] }],
    };

    await prisma.resource.findMany({
      where: {
        // OR: {
        //   OR: [
        // {
        UserACL: {
          none: {},
          //     },
          //   },
          // ],
        },
      },
      select: {
        id: true,
      },
      take: 10,
    });
    const aclCriteria = aclClause(identities, applicationId);
    prisma.resource.findMany({
      where: aclCriteria,
    });
  });
});
