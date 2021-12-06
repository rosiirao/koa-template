import { Prisma, PrismaPromise, Role } from '@prisma/client';
import prisma from '../client';
import { enumerableFlat } from '../query.shared';
import { DEFAULT_ROW_COUNT, queryInput, verifyName } from '../query.shared';

export const create = (name: string, applicationId = 0) => {
  verifyName(name);
  return prisma.role.create({
    data: {
      name,
      application: {
        connect: { id: applicationId },
      },
      Resource: {
        create: {},
      },
    },
  });
};

export const createMany = async (
  role: Array<{
    name: string;
    applicationId: number;
  }>
) => {
  role.forEach(({ name }) => verifyName(name));

  return prisma.$transaction(
    role.map(({ name, applicationId }) => {
      return create(name, applicationId);
    })
  );
};

export const createInherit = async (
  data: Prisma.Enumerable<{
    inheritId: number;
    roleId: number;
  }>
): Promise<Prisma.BatchPayload> => {
  return prisma.roleInherit.createMany({
    data,
  });
};

export const inheritTo = async (
  role: Prisma.Enumerable<string>,
  inherit: string,
  applicationId: number
): Promise<void> => {
  const assignee = await prisma.role.findMany({
    where: {
      name: {
        in: enumerableFlat(role),
      },
      applicationId,
      assignee: {
        none: {
          inherit: {
            name: inherit,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
  await prisma.role.update({
    where: {
      name_applicationId: {
        name: inherit,
        applicationId,
      },
    },
    data: {
      inherit: {
        createMany: {
          data: assignee.map(({ id }) => ({ roleId: id })),
        },
      },
    },
  });
};

/**
 *
 * @todo orphan from inherit
 */
export const orphan = () => 0;

/**
 * @todo revoke assignment
 */
export const revoke = () => 0;

export function assignUser(
  roleId: number,
  userId: Prisma.Enumerable<number>
): PrismaPromise<Prisma.BatchPayload> {
  return prisma.roleUserAssignment.createMany({
    data: enumerableFlat(userId).map((userId) => ({ userId, roleId })),
    skipDuplicates: true,
  });
}

export function assignGroup(
  roleId: number,
  groupId: Prisma.Enumerable<number>
): PrismaPromise<Prisma.BatchPayload> {
  return prisma.roleGroupAssignment.createMany({
    data: enumerableFlat(groupId).map((groupId) => ({ groupId, roleId })),
    skipDuplicates: true,
  });
}

export async function listRolesOfUser(
  applicationId: number,
  userId: number
): Promise<Iterable<Role['id']>> {
  const roleFind = await prisma.role.findMany({
    where: {
      applicationId,
      user: {
        some: {
          userId,
        },
      },
    },
    select: {
      id: true,
    },
  });
  return await listRolesInherited(
    applicationId,
    roleFind.map(({ id }) => id)
  );
}

export async function listRolesOfGroup(
  applicationId: number,
  groupId: number
): Promise<Iterable<Role['id']>> {
  const roleFind = await prisma.role.findMany({
    where: {
      applicationId,
      group: {
        some: {
          groupId,
        },
      },
    },
    select: {
      id: true,
    },
  });
  return await listRolesInherited(
    applicationId,
    roleFind.map(({ id }) => id)
  );
}

export async function listRolesOfGroups(
  applicationId: number,
  groups: Array<number>
): Promise<Iterable<Role['id']>> {
  if (groups.length === 0) return [];
  const roleFind = await prisma.role.findMany({
    where: {
      applicationId,
      group: {
        some: {
          groupId: {
            in: groups,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
  return await listRolesInherited(
    applicationId,
    roleFind.map(({ id }) => id)
  );
}

async function listRolesInherited(applicationId: number, roles: Array<number>) {
  const role = new Set(roles);
  let currentRole = [...role];

  const filterAndAppend = (id: number) => {
    const repeated = role.has(id);
    if (repeated) return false;
    role.add(id);
    return true;
  };
  while (currentRole.length > 0) {
    const inherit = await prisma.roleInherit.findMany({
      where: {
        roleId: {
          in: currentRole,
        },
        inherit: {
          applicationId,
        },
      },
      select: {
        inheritId: true,
      },
    });
    currentRole = [
      ...new Set(inherit.map(({ inheritId }) => inheritId)),
    ].filter(filterAndAppend);
  }
  return role;
}

export async function listRoleInherited(applicationId: number, roleId: number) {
  return listRolesInherited(applicationId, [roleId]);
}

export function listRoles(
  applicationId: number,
  count = DEFAULT_ROW_COUNT,
  option = {} as {
    start?: number;
    skip?: number;
  }
): PrismaPromise<Array<{ id: number; name: string }>> {
  const { start = 1, skip = 1 } = option;
  return prisma.role.findMany({
    where: {
      applicationId,
    },
    take: count,
    ...queryInput('skip', skip, skip > 1),
    ...queryInput('cursor', { id: start }, start > 1),
    select: {
      id: true,
      name: true,
    },
  });
}

export function countRole(): PrismaPromise<number> {
  return prisma.role.count();
}
