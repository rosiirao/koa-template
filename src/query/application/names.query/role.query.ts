import { Prisma, PrismaPromise, Role } from '@prisma/client';
import prisma from '../../client.js';
import { enumerableFlat, PageOption } from '../../query.shared.js';
import {
  DEFAULT_ROW_COUNT,
  queryInput,
  verifyName,
} from '../../query.shared.js';

const roleSelector: Prisma.RoleSelect = {
  name: true,
  Privilege: true,
  assignor: true,
};

export const create = (applicationId: number, data: { name: string }) => {
  verifyName(data.name);
  return prisma.role.create({
    data: {
      ...data,
      application: {
        connect: { id: applicationId },
      },
      Resource: {
        create: {},
      },
    },
  });
};

export function find(id: number, applicationId?: number) {
  if (applicationId === undefined)
    return prisma.role.findFirst({ where: { id }, select: roleSelector });

  return prisma.application
    .findUnique({
      where: { id: applicationId },
    })
    .Role({ where: { id }, select: roleSelector });
}

export function update(
  id: number,
  data: { name: string },
  applicationId?: number
) {
  verifyName(data.name);
  const updateArgs: Parameters<typeof prisma.role.update>[0] = {
    where: { id },
    data,
  };
  if (applicationId === undefined) return prisma.role.update(updateArgs);
  return prisma.application
    .update({
      where: {
        id: applicationId,
      },
      data: {
        Role: {
          update: updateArgs,
        },
      },
    })
    .Role({ where: { id } });
}

export function remove(id: number, applicationId?: number) {
  if (applicationId === undefined) return prisma.role.delete({ where: { id } });
  return prisma.application.update({
    where: { id: applicationId },
    data: { Role: { delete: { id } } },
  });
}

export const createMany = (
  role: Array<{
    name: string;
    applicationId: number;
  }>
) => {
  role.forEach(({ name }) => verifyName(name));

  return prisma.$transaction(
    role.map(({ name, applicationId }) => {
      return create(applicationId, { name });
    })
  );
};

export const createInherit = async (
  data: Prisma.Enumerable<{
    assignorId: number;
    roleId: number;
  }>
): Promise<Prisma.BatchPayload> => {
  return prisma.roleInherit.createMany({
    data,
  });
};

export const inheritTo = async (
  role: Prisma.Enumerable<string>,
  inheritTo: string,
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
          assignor: {
            name: inheritTo,
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
        name: inheritTo,
        applicationId,
      },
    },
    data: {
      assignor: {
        createMany: {
          data: assignee.map(({ id }) => ({ assignorId: id })),
        },
      },
    },
    select: roleSelector,
  });
};

export function inheritToById(
  applicationId: number,
  roleId: number,
  inheritTo: number
) {
  return prisma.application.update({
    where: { id: applicationId },
    data: {
      Role: {
        update: {
          where: { id: roleId },
          data: {
            assignor: { create: { assignorId: inheritTo } },
          },
        },
      },
    },
  });
}

export function revokeInherit(
  applicationId: number,
  roleId: number,
  inheritTo: number
) {
  return prisma.application.update({
    where: { id: applicationId },
    data: {
      Role: {
        update: {
          where: { id: roleId },
          data: {
            assignor: {
              delete: {
                roleId_assignorId: {
                  roleId,
                  assignorId: inheritTo,
                },
              },
            },
          },
        },
      },
    },
  });
}

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

export function revokeUser(
  roleId: number,
  userId: Prisma.Enumerable<number>
): PrismaPromise<Prisma.BatchPayload> {
  return prisma.roleUserAssignment.deleteMany({
    where: {
      roleId,
      userId: { in: enumerableFlat(userId) },
    },
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

export function revokeGroup(
  roleId: number,
  groupId: Prisma.Enumerable<number>
): PrismaPromise<Prisma.BatchPayload> {
  return prisma.roleGroupAssignment.deleteMany({
    where: {
      roleId,
      groupId: { in: enumerableFlat(groupId) },
    },
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
  return await listRolesInherited(roleFind.map(({ id }) => id));
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
  return await listRolesInherited(roleFind.map(({ id }) => id));
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
  return await listRolesInherited(roleFind.map(({ id }) => id));
}

async function listRolesInherited(roles: Array<number>) {
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
      },
      select: {
        assignorId: true,
      },
    });
    currentRole = [
      ...new Set(inherit.map(({ assignorId }) => assignorId)),
    ].filter(filterAndAppend);
  }
  return role;
}

export async function listRoleInherited(roleId: number) {
  return listRolesInherited([roleId]);
}

export function listRoles(
  applicationId: number,
  option = {} as PageOption<Prisma.RoleOrderByWithAggregationInput>
): PrismaPromise<Array<{ id: number; name: string }>> {
  const { start = 1, skip = 1, count = DEFAULT_ROW_COUNT } = option;

  return prisma.role.findMany({
    where: {
      applicationId,
    },
    ...queryInput('take', count, isFinite(count)),
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
