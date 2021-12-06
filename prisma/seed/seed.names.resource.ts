import prisma from '../../src/query/client';
import { listUsers } from '../../src/query/user.query';
import { aclCriteria } from './seed.shared';

import { ThenArg } from '../../src/utils';
import { Group, Role } from '.prisma/client';

// Register users, groups, roles to resource table, make the it can be access directly in *names* application

/**
 * Register users to NamesResourcesMap
 */
export async function registerNamesResource() {
  const take = 100;

  const users = [] as ThenArg<ReturnType<typeof listUsers>>;
  for (let skip = 0; ; skip += take) {
    const fetched = await listUsers(aclCriteria, take, { skip });
    if (fetched.length === 0) break;
    users.push(...fetched);
  }

  const groups = [] as Array<Group>;
  for (let skip = 0; ; skip += take) {
    const fetched = await prisma.group.findMany({ take, skip });
    if (fetched.length === 0) break;
    groups.push(...fetched);
  }

  const roles = [] as Array<Role>;
  for (let skip = 0; ; skip += take) {
    const fetched = await prisma.role.findMany({ take, skip });
    if (fetched.length === 0) break;
    roles.push(...fetched);
  }

  // prisma.$transaction(
  //   users.map(({ id }) =>
  //     prisma.namesResourceMap.create({
  //       data: {
  //         user: {
  //           connect: {
  //             id,
  //           },
  //         },
  //       },
  //     })
  //   )
  // );

  prisma.$transaction(
    groups.map(({ id }) =>
      prisma.namesResourceMap.create({
        data: {
          group: {
            connect: { id },
          },
        },
      })
    )
  );
  prisma.$transaction(
    roles.map(({ id }) =>
      prisma.namesResourceMap.create({
        data: {
          role: {
            connect: { id },
          },
        },
      })
    )
  );

  // prisma.user.updateMany({
  //   where: {
  //     id: {
  //       in: users.map(({ id }) => id),
  //     },
  //   },
  //   data: users.map((u) => ({
  //     id: u.id,
  //     Resource: {
  //       create: {},
  //     },
  //   })),
  // });

  // prisma.group.updateMany({
  //   data: groups.map(({ id }) => ({
  //     id,
  //     Resource: {
  //       create: {},
  //     },
  //   })),
  // });

  // prisma.role.updateMany({
  //   data: roles.map(({ id }) => ({
  //     id,
  //     Resource: {
  //       create: {},
  //     },
  //   })),
  // });
}
