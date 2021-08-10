import { PrismaClient, User, Post, Profile } from '@prisma/client';
import createHttpError from 'http-errors';
import bcrypt from 'bcrypt';

export const prisma = new PrismaClient();

const saltRounds = 8;
// const myPlaintextPassword = 's0//P4$$w0rD';
// const someOtherPlaintextPassword = 'not_bacon';

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
};

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
      password: await hashPassword(password),
      posts: {
        create: { title: 'Hello World' },
      },
      profile: {
        create: { bio: 'I like turtles' },
      },
    },
  });

  /* const post =  */ await prisma.post.update({
    where: { id: 1 },
    data: { published: true },
  });

  return user;
};

type UserResult = User & {
  posts: Post[];
  profile: Profile;
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

export const findOne = async (id: number): Promise<UserResult> => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      posts: true,
      profile: true,
    },
  });
  return user;
};
