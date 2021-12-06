import prisma from '../client';
import { resourceACLSelector } from '../resource.query';

export function findACL(resourceId: number) {
  return prisma.namesResource
    .findUnique({
      where: {
        id: resourceId,
      },
      select: {
        UnityResource: {
          select: resourceACLSelector,
        },
      },
    })
    .UnityResource({
      select: resourceACLSelector,
    });
}
