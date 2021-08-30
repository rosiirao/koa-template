import { PrismaClient, User, Post, Profile, Credential } from '@prisma/client';
import createHttpError from 'http-errors';

export const prisma = new PrismaClient();

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

export const findAll = async (): Promise<UserResult[]> => {
  const allUsers = await prisma.user.findMany({
    include: {
      posts: true,
      profile: true,
    },
  });
  return allUsers;
};

export const findOne = async (uniqueInput: {
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
  id: number,
  data: {
    password?: string;
    refreshToken: string;
    refreshTokenExp: Date;
  }
): Promise<Credential> => {
  return prisma.credential.update({
    where: { userId: id },
    data,
  });
};

export const findCredential = async (uniqueInput: {
  id?: number;
  refreshToken?: string;
}): Promise<Credential | null> => {
  return prisma.credential.findUnique({
    where: uniqueInput,
  });
};
