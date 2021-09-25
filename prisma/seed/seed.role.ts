import { Application, Prisma } from '@prisma/client';
import { createMany as createRole } from '../../src/query/role.query';
import {
  createApplication,
  createResource,
  findApplication,
} from '../../src/query/resource.query';
import { randomName } from './seed.shared';
import { nextId } from '../../src/utils';

/**
 * Seed role for APP *Administrator*
 */
const APP_NAME = 'Administrator';

/**
 * Seed the administrator application
 */
const seedAdministrator = () => {
  return createApplication(APP_NAME);
};

/**
 * @TODO create inherit relation
 */
export const seedRole = async (): Promise<Prisma.BatchPayload> => {
  const role = roleHierarchyList(50);
  const application =
    (await findApplication({ name: APP_NAME }))[0] ??
    (await seedAdministrator());

  const updateInput = [...role]
    .reduce<Map<string, { name: string; applicationId: number }>>(
      (acc, fullname) => {
        fullname.split(/\//g).forEach((name) => {
          acc.set(name, {
            name,
            applicationId: application.id,
          });
        });
        return acc;
      },
      new Map()
    )
    .values();
  const roleCreated = createRole([...updateInput]);

  // create inherit relation

  return roleCreated;
};

/**
 * Generate role name list
 */
export function roleHierarchyList(roleCount = 50): Iterable<string> {
  const roleFullName = new Set<string>();
  for (let i = 0; i < roleCount; i++) {
    const newRole = randomName('/').replace(/^\/+|(?<=\/)\/+|\/+$/gi, '');
    roleFullName.add(newRole);
  }
  return roleFullName;
}

export const seedApplication = async (): Promise<Application[]> => {
  return Promise.all([
    createApplication('home'),
    createApplication('demo'),
    createApplication('help'),
  ]);
};

export const seedResource = async (applicationId: number): Promise<unknown> => {
  return createResource(nextId(), applicationId, { readers: [], authors: [] });
};
