import prisma from '../client.js';
import { resourceACLSelector } from '../resource.query.js';

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
