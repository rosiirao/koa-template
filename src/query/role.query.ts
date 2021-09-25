import { Prisma, Role } from '@prisma/client';
import prisma from './client';
import { enumerableFlat } from './group.query';
import { verifyName } from './query.shared';

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

/**
 * @todo assign
 */
export const assign = () => 0;

export const findRole = async (
  userId: number,
  applicationId: number
): Promise<Iterable<Role['id']>> => {
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
};
