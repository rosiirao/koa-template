import {
  User,
  Post,
  Profile,
  Credential,
  Prisma,
  PrismaPromise,
} from '@prisma/client';
import createHttpError from 'http-errors';
import { sliceMap } from '../utils';

import prisma from './client';
import { queryInput, orderByInput, DEFAULT_ROW_COUNT } from './query.shared';
import { OrderByQuery } from './query.shared';

type UserCreateInput = {
  email: string;
  password: string;
  others?: {
    name: string;
    alias?: string;
    group?: string[];
  };
};

export const create = async ({
  email,
  password,
  others = {
    name: email.replace(/@.*$/, ''),
  },
}: UserCreateInput): Promise<User> => {
  const { name, alias, group } = others;
  if (name.trim() === '' || email.trim() === '') {
    throw createHttpError(422, "User name and email can't be empty");
  }

  const groupId = (
    await Promise.all(
      group?.map(async (name) => {
        const group = await prisma.group.findFirst({
          where: {
            name,
          },
          select: {
            id: true,
          },
        });
        return { groupId: group?.id };
      }) ?? []
    )
  ).filter(
    (value): value is { groupId: number } => value.groupId !== undefined
  );

  const user = prisma.user.create({
    data: {
      name,
      ...queryInput('alias', alias),
      email,
      ...(groupId.length > 0
        ? {
            group: {
              createMany: {
                data: groupId,
              },
            },
          }
        : undefined),
      credential: {
        create: {
          password,
        },
      },
    },
  });

  return user;
};

export const createMany = async (
  user: UserCreateInput[]
): Promise<Prisma.BatchPayload> => {
  // avoid pool_timeout, we slice the all create actions by 50.
  const slice = sliceMap(user, 50);
  return slice.reduce<Promise<{ count: number }>>(async (acc, slice) => {
    const created = (await acc).count;
    const sliceCreate = await Promise.all(slice.map<Promise<User>>(create));
    return {
      count: created + sliceCreate.length,
    };
  }, Promise.resolve({ count: 0 }));
};

type UserResult = User & {
  posts: Post[];
  profile: Profile | null;
};

export function findAll(
  count = DEFAULT_ROW_COUNT,
  option = {} as {
    start?: number;
    skip?: number;
  },
  query?: OrderByQuery<Prisma.UserOrderByWithAggregationInput>
): PrismaPromise<UserResult[]> {
  const orderBy = orderByInput<Prisma.UserOrderByWithAggregationInput>(
    query,
    'id'
  );
  const { skip = 1, start = 1 } = option;
  return prisma.user.findMany({
    include: {
      posts: true,
      profile: true,
    },
    take: count,
    ...queryInput('skip', skip, skip > 1),
    ...queryInput('cursor', { id: start }, start > 1),
    ...queryInput('orderBy', orderBy),
  });
}

export function findUnique(uniqueInput: {
  id?: number;
  email?: string;
}): PrismaPromise<UserResult | null> {
  return prisma.user.findUnique({
    where: uniqueInput,
    include: {
      posts: true,
      profile: true,
    },
  });
}

export function findUserCredential(
  uniqueInput: {
    id?: number;
    email?: string;
  },
  field = ['password' as keyof Credential]
): PrismaPromise<
  (Partial<User> & { credential: Partial<Credential> | null }) | null
> {
  const select = field.reduce((s, k) => ({ ...s, [k]: true }), {});
  return prisma.user.findUnique({
    where: uniqueInput,
    select: {
      id: true,
      credential: { select },
    },
  });
}

export async function updateUserCredential(
  id: number | { email: string },
  data:
    | {
        password: string;
      }
    | {
        refreshToken: string;
        refreshTokenExp: Date;
      }
): Promise<{ id: number }> {
  const query: { id: number } | { email: string } =
    typeof id === 'number'
      ? { id }
      : {
          email: id.email,
        };

  return prisma.user.update({
    where: query,
    data: {
      credential: {
        update: data,
      },
    },
    select: { id: true },
  });
}

export function findCredential(uniqueInput: {
  userId?: number;
  refreshToken?: string;
}): PrismaPromise<Credential | null> {
  return prisma.credential.findUnique({
    where: uniqueInput,
  });
}
