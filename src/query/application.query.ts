import prisma from './client';
import { LENGTH_MAX_NAME } from './query.shared';

import { Application, PrismaPromise } from '.prisma/client';

export const createApplication = (
  name: string
): PrismaPromise<{
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

export const listApplication = (option?: {
  name?: string;
  id?: number;
}): PrismaPromise<Application[]> => {
  if (option?.id === undefined && option?.name === undefined) {
    throw new Error('Query application need id or name');
  }
  return prisma.application.findMany({
    where: option,
  });
};

export const findUnique = (
  uniqueInput: { id: number } | { name: string }
): PrismaPromise<{ id: number } | null> => {
  return prisma.application.findFirst({
    where: uniqueInput,
    select: {
      id: true,
      name: true,
    },
  });
};
