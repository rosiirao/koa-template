import prisma from '../client';
import { LENGTH_MAX_NAME } from '../query.shared';

import { Application, PrismaPromise, Privilege } from '.prisma/client';

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

/**
 * List application without privilege filter
 * The role assignment is attached to application, so we need all applications first, and then we can filter with role
 */
export function listApplication(): PrismaPromise<Application[]> {
  return prisma.application.findMany();
}

export function findUnique(
  uniqueInput: { id: number } | { name: string }
): PrismaPromise<Application | null> {
  return prisma.application.findFirst({
    where: uniqueInput,
    select: {
      id: true,
      name: true,
      Role: {
        select: {
          id: true,
          PrivilegeAssignment: {
            select: {
              privilege: true,
            },
          },
        },
      },
      PrivilegeUserAssignment: true,
      PrivilegeGroupAssignment: true,
    },
  });
}

/**
 *
 * @param name
 * @param creator The userId of creator
 * @returns
 */
export function addApplication(name: string, creator: number) {
  return prisma.application.create({
    data: {
      name,
      PrivilegeUserAssignment: {
        create: {
          userId: creator,
          privilege: Privilege.DELETE_RESOURCE,
        },
      },
    },
  });
}

export function modifyApplication(
  id_name: { id: number } | { name: string },
  data: { name: string }
) {
  return prisma.application.update({
    where: id_name,
    data,
  });
}

export function removeApplication(id_name: { id: number } | { name: string }) {
  return prisma.application.delete({
    where: id_name,
  });
}
