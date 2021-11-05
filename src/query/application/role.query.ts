import { Prisma, PrismaPromise, Role } from '@prisma/client';
import prisma from '../client';
import { enumerableFlat } from '../group.query';
import { DEFAULT_ROW_COUNT, queryInput, verifyName } from '../query.shared';

export const create = async (
  name: string,
  applicationId = 0
): Promise<Role> => {
  verifyName(name);
  return prisma.role.create({
    data: { name, applicationId },
  });
};

export const createMany = async (
  role: Array<{
    name: string;
    applicationId: number;
  }>
): Promise<Prisma.BatchPayload> => {
  role.forEach(({ name }) => verifyName(name));

  return prisma.role.createMany({
    data: role,
  });
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

export async function findRole(
  userId: number,
  applicationId: number
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
  // role has the inherit map, so need find
  const role = new Set(roleFind?.map(({ id }) => id));
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

export function listRole(
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
