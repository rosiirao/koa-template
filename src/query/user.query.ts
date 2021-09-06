import { User, Post, Profile, Credential, Prisma } from '@prisma/client';
import createHttpError from 'http-errors';

import prisma from './client';
import { queryInput, orderByInput } from './shared';
import { OrderByQuery } from './shared';

export const create = async ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<unknown> => {
  if (name.trim() === '' || email.trim() === '') {
    throw createHttpError(422, "User name and email can't be empty");
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
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

type UserResult = User & {
  posts: Post[];
  profile: Profile | null;
};

export const findAll = async (
  count?: number,
  query?: OrderByQuery<Prisma.UserOrderByInput>
): Promise<UserResult[]> => {
  const orderBy = orderByInput<Prisma.UserOrderByInput>(query, 'id');
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
