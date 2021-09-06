import prisma from './client';
import { Prisma } from '.prisma/client';
import { queryInput, orderByInput } from './shared';
import { OrderByQuery } from './shared';

type ResourcePermission = Partial<Record<'authors' | 'readers', number[]>>;
type PermissionRecord = { author: boolean; reader: boolean; userId: number };
type ResourcePermissionRecord = PermissionRecord & {
  resourceId: number;
};

const permissionSelector = {
  author: true,
  reader: true,
  userId: true,
};

const mapPermissionToRecord = (
  data: ResourcePermission
): ResourcePermissionRecord[] => {
  return Object.entries(data).reduce<ResourcePermissionRecord[]>(
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
        } as ResourcePermissionRecord);
      });
      return data;
    },
    []
  );
};

export const createResource = async (
  id: number,
  data: Partial<Record<'authors' | 'readers', number[]>>
): Promise<{
  id: number;
  userResource: PermissionRecord[];
}> => {
  const userResourceData = mapPermissionToRecord(data);
  return prisma.resource.create({
    data: {
      id,
      userResource: {
        createMany: {
          skipDuplicates: true,
          data: userResourceData,
        },
      },
    },
    select: {
      id: true,
      userResource: {
        select: permissionSelector,
      },
    },
  });
};

export const findResource = async (
  id: number
): Promise<{ id: number; userResource: PermissionRecord[] } | null> => {
  return prisma.resource.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      userResource: {
        select: permissionSelector,
      },
    },
  });
};

export const findAllResources = async (
  count?: number,
  query?: OrderByQuery<Prisma.ResourceOrderByInput>
): Promise<{ id: number; userResource: PermissionRecord[] }[]> => {
  const orderBy = orderByInput<Prisma.ResourceOrderByInput>(query, 'id');
  if (count === undefined && orderBy === undefined) {
    return [];
  }
  return prisma.resource.findMany({
    select: {
      id: true,
      userResource: {
        select: permissionSelector,
      },
    },
    ...queryInput('take', count),
    ...queryInput('orderBy', orderBy),
  });
};

export const findAllResourcesByUser = (
  userId: number,
  startFromId?: number,
  count?: number,
  query?: OrderByQuery<Prisma.UserResourceOrderByInput>
): Promise<ResourcePermissionRecord[]> => {
  const orderBy = orderByInput<Prisma.UserResourceOrderByInput>(
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
  return prisma.userResource.findMany({
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
  userResource: PermissionRecord[];
} | null> => {
  const userResourceData = mapPermissionToRecord(data);
  return prisma.resource.update({
    where: {
      id: resourceId,
    },
    data: {
      userResource: {
        deleteMany: {
          userId: {},
        },
        createMany: {
          data: userResourceData,
          skipDuplicates: true,
        },
      },
    },
    select: {
      id: true,
      userResource: {
        select: permissionSelector,
      },
    },
  });
};
