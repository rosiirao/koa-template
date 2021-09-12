import { User, Post, Profile, Credential, Prisma } from '@prisma/client';
import createHttpError from 'http-errors';

import prisma from './client';
import { queryInput, orderByInput } from './query.shared';
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
    alias: email.replace(/@.*$/, ''),
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

  const user = await prisma.user.create({
    data: {
      name,
      ...queryInput('alias', alias),
      email,
      group: {
        createMany: {
          data: groupId,
        },
      },
      posts: {
        create: { title: 'Hello World' },
      },
      profile: {
        create: { bio: 'I like turtles' },
      },
      credential: {
        create: {
          password,
        },
      },
    },
  });

  /* const post =  */ await prisma.post.update({
    where: { id: user.id },
    data: { published: true },
  });

  return user;
};

export const createMany = (
  user: UserCreateInput[]
): Promise<Prisma.BatchPayload> => {
  const userInput = user.map(({ others, email, ...rest }) => {
    const { name, alias } = others ?? { name: email.replace(/@.*$/, '') };

    const input = {
      name,
      email,
      ...(alias ? { alias } : undefined),
      ...rest,
    };

    if (
      Object.entries(input).some((entry) => {
        const [key, value] = entry;
        if (typeof value === 'string' && key !== 'password') {
          return value.length > 32;
        }
        return false;
      })
    ) {
      throw new Error('string value length get bigger than 32');
    }

    return input;
  });
  return prisma.user.createMany({
    data: userInput,
  });
};

type UserResult = User & {
  posts: Post[];
  profile: Profile | null;
};

export const findAll = async (
  count?: number,
  query?: OrderByQuery<Prisma.UserOrderByWithAggregationInput>
): Promise<UserResult[]> => {
  const orderBy = orderByInput<Prisma.UserOrderByWithAggregationInput>(
    query,
    'id'
  );
  const allUsers = await prisma.user.findMany({
    include: {
      posts: true,
      profile: true,
    },
    ...queryInput('take', count),
    ...queryInput('orderBy', orderBy),
  });
  return allUsers;
};

export const findUnique = async (uniqueInput: {
  id?: number;
  email?: string;
}): Promise<UserResult | null> => {
  const user = await prisma.user.findUnique({
    where: uniqueInput,
    include: {
      posts: true,
      profile: true,
    },
  });
  return user;
};

export const findUserCredential = async (
  uniqueInput: {
    id?: number;
    email?: string;
  },
  field = ['password' as keyof Credential]
): Promise<
  (Partial<User> & { credential: Partial<Credential> | null }) | null
> => {
  const select = field.reduce((s, k) => ({ ...s, [k]: true }), {});
  const user = await prisma.user.findUnique({
    where: uniqueInput,
    select: {
      id: true,
      credential: { select },
    },
  });
  return user;
};

export const updateUserCredential = async (
  id: number | { email: string },
  data:
    | {
        password: string;
      }
    | {
        refreshToken: string;
        refreshTokenExp: Date;
      }
): Promise<{ id: number }> => {
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
};

export const findCredential = async (uniqueInput: {
  userId?: number;
  refreshToken?: string;
}): Promise<Credential | null> => {
  return prisma.credential.findUnique({
    where: uniqueInput,
  });
};
