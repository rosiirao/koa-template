import prisma from './client.js';
import { Prisma } from '@prisma/client';
import { queryInput, orderByInput } from './query.shared.js';
import { OrderByQuery } from './query.shared.js';

type ResourceAccessControl = Partial<Record<'authors' | 'readers', number[]>>;
type AccessControlFields = {
  author: boolean;
  reader: boolean;
  userId: number;
};

type ResourceAccessControlRecord = AccessControlFields & {
  resourceId: number;
};

const accessControlSelector = <T extends object>(mixed: T) =>
  ({
    author: true,
    reader: true,
    owner: true,
    ...mixed,
  } as const);

const userACLSelector = accessControlSelector({ userId: true } as const);
const groupACLSelector = accessControlSelector({ groupId: true } as const);
const roleACLSelector = accessControlSelector({ roleId: true } as const);

export const resourceACLSelector = {
  id: true,
  UserACL: {
    select: userACLSelector,
  },
  GroupACL: {
    select: groupACLSelector,
  },
  RoleACL: {
    select: roleACLSelector,
  },
} as const;

const mapAccessControlToRecord = (
  data: ResourceAccessControl
): ResourceAccessControlRecord[] => {
  return Object.entries(data).reduce<ResourceAccessControlRecord[]>(
    (data, [key, users]) => {
      const [enable, disable] =
        key === 'authors' ? ['author', 'reader'] : ['reader', 'author'];

      users.forEach((id) => {
        const resource = data.find(({ userId }) => userId === id);
        if (resource !== undefined) {
          Object.assign(resource, { [enable]: true });
          return;
        }
        data.push({
          userId: id,
          [enable]: true,
          [disable]: false,
        } as ResourceAccessControlRecord);
      });
      return data;
    },
    []
  );
};

export const createResource = async (
  id: number,
  applicationId: number,
  data: Partial<Record<'authors' | 'readers', number[]>>
): Promise<{
  id: number;
  applicationId: number;
  UserACL: AccessControlFields[];
}> => {
  const userResourceData = mapAccessControlToRecord(data);
  return prisma.resource.create({
    data: {
      id,
      applicationId,
      UserACL: {
        createMany: {
          skipDuplicates: true,
          data: userResourceData,
        },
      },
    },
    select: {
      id: true,
      applicationId: true,
      UserACL: {
        select: userACLSelector,
      },
    },
  });
};

export const findResource = async (id: number) => {
  return prisma.resource.findUnique({
    where: {
      id,
    },
    select: resourceACLSelector,
  });
};

export const findAllResources = async (
  applicationId: number,
  user?: { id: number; role: number[]; group: number[] },
  count?: number,
  query?: OrderByQuery<Prisma.ResourceOrderByWithAggregationInput>
): Promise<{ id: number; UserACL: AccessControlFields[] }[]> => {
  const orderBy = orderByInput<Prisma.ResourceOrderByWithAggregationInput>(
    query,
    'id'
  );
  if (count === undefined && orderBy === undefined) {
    return [];
  }
  const queryByUser: Prisma.ResourceWhereInput | undefined =
    user === undefined
      ? undefined
      : {
          UserACL: {
            every: {
              userId: user.id,
            },
          },
        };
  const queryByGroup: Prisma.ResourceWhereInput | undefined =
    user === undefined
      ? undefined
      : {
          GroupACL: {
            every: {
              groupId: {
                in: user.group,
              },
            },
          },
        };
  const queryByRole: Prisma.ResourceWhereInput | undefined =
    user === undefined
      ? undefined
      : {
          RoleACL: {
            every: {
              roleId: {
                in: user.role,
              },
            },
          },
        };
  return prisma.resource.findMany({
    where: {
      applicationId,
      ...queryByUser,
      ...queryByGroup,
      ...queryByRole,
    },
    select: resourceACLSelector,
    ...queryInput('take', count),
    ...queryInput('orderBy', orderBy),
  });
};

/**
 * @deprecated  use findAllResources
 * @param userId
 * @param startFromId
 * @param count
 * @param query
 * @returns
 */
export const findAllResourcesByUser = (
  userId: number,
  startFromId?: number,
  count?: number,
  query?: OrderByQuery<Prisma.UserResourceAccessControlAvgOrderByAggregateInput>
): Promise<ResourceAccessControlRecord[]> => {
  const orderBy =
    orderByInput<Prisma.UserResourceAccessControlAvgOrderByAggregateInput>(
      query,
      'userId'
    );
  const cursor =
    startFromId === undefined
      ? undefined
      : {
          userId_resourceId: {
            userId,
            resourceId: startFromId,
          },
        };
  return prisma.userResourceAccessControl.findMany({
    where: {
      userId,
    },
    ...queryInput('cursor', cursor),
    ...queryInput('orderBy', orderBy),
    ...queryInput('take', count),
  });
};

export const updateResources = (
  resourceId: number,
  data: Partial<Record<'authors' | 'readers', number[]>>
): Promise<{
  id: number;
  UserACL: AccessControlFields[];
} | null> => {
  const userResourceData = mapAccessControlToRecord(data);
  return prisma.resource.update({
    where: {
      id: resourceId,
    },
    data: {
      UserACL: {
        deleteMany: {
          userId: {},
        },
        createMany: {
          data: userResourceData,
          skipDuplicates: true,
        },
      },
    },
    select: resourceACLSelector,
  });
};

export const removeResource = async (
  id: number,
  user?: { id: number; role: number[]; group: number[] }
): Promise<boolean> => {
  if (user === undefined) {
    await prisma.resource.delete({
      where: { id },
    });
    return true;
  }
  const queryByGroup: Prisma.ResourceWhereInput | undefined =
    user.group.length === 0
      ? undefined
      : {
          GroupACL: {
            some: {
              author: true,
              groupId: {
                in: user?.group ?? [],
              },
            },
          },
        };

  const queryByUser: Prisma.ResourceWhereInput | undefined =
    user.id === undefined
      ? undefined
      : {
          UserACL: {
            some: { id: user.id },
          },
        };

  const queryByRole: Prisma.ResourceWhereInput | undefined =
    user !== undefined && user.role.length === 0
      ? undefined
      : {
          RoleACL: {
            some: {
              author: true,
              roleId: {
                in: user.role,
              },
            },
          },
        };
  const resource = await prisma.resource.deleteMany({
    where: {
      id,
      OR: [queryByGroup, queryByUser, queryByRole].filter(
        (v) => v !== undefined
      ) as Array<Prisma.ResourceWhereInput>,
    },
  });
  if (resource.count === 0 && (await findResource(id)) !== undefined) {
    return false;
  }
  return true;
};
