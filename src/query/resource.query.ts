import prisma from './client';
import { Prisma, Application } from '.prisma/client';
import { queryInput, orderByInput } from './query.shared';
import { OrderByQuery } from './query.shared';

import { LENGTH_MAX_NAME } from './query.shared';

type ResourceAccessControl = Partial<Record<'authors' | 'readers', number[]>>;
type AccessControlFields = {
  author: boolean;
  reader: boolean;
  userId: number;
};

type ResourceAccessControlRecord = AccessControlFields & {
  resourceId: number;
};

const accessControlSelector = {
  author: true,
  reader: true,
  userId: true,
};

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

export const createApplication = async (
  name: string
): Promise<{
  id: number;
  name: string;
}> => {
  if (name.length > LENGTH_MAX_NAME) {
    throw new Error(
      `The length of the role name can\t exceed ${LENGTH_MAX_NAME}, got name ${name}`
    );
  }
  return prisma.application.create({
    data: { name },
  });
};

export const findApplication = async (option: {
  name?: string;
  id?: number;
}): Promise<Application[]> => {
  if (option.id === undefined && option.name === undefined) {
    throw new Error('Query application need id or name');
  }
  return prisma.application.findMany({
    where: option,
  });
};

export const createResource = async (
  id: number,
  applicationId: number,
  data: Partial<Record<'authors' | 'readers', number[]>>
): Promise<{
  id: number;
  applicationId: number;
  userResource: AccessControlFields[];
}> => {
  const userResourceData = mapAccessControlToRecord(data);
  return prisma.resource.create({
    data: {
      id,
      applicationId,
      userResource: {
        createMany: {
          skipDuplicates: true,
          data: userResourceData,
        },
      },
    },
    select: {
      id: true,
      applicationId: true,
      userResource: {
        select: accessControlSelector,
      },
    },
  });
};

export const findResource = async (
  id: number
): Promise<{ id: number; userResource: AccessControlFields[] } | null> => {
  return prisma.resource.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      userResource: {
        select: accessControlSelector,
      },
    },
  });
};

export const findAllResources = async (
  applicationId: number,
  user?: { id: number; role: number[]; group: number[] },
  count?: number,
  query?: OrderByQuery<Prisma.ResourceOrderByWithAggregationInput>
): Promise<{ id: number; userResource: AccessControlFields[] }[]> => {
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
          userResource: {
            every: {
              userId: user.id,
            },
          },
        };
  const queryByGroup: Prisma.ResourceWhereInput | undefined =
    user === undefined
      ? undefined
      : {
          groupResource: {
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
          roleResource: {
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
    select: {
      id: true,
      userResource: {
        select: accessControlSelector,
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
  userResource: AccessControlFields[];
} | null> => {
  const userResourceData = mapAccessControlToRecord(data);
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
        select: accessControlSelector,
      },
    },
  });
};
