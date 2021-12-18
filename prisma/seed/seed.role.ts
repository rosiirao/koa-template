import { Application, Prisma, Role } from '@prisma/client';
import {
  createMany as createRole,
  inheritTo,
} from '../../src/query/application/names.query/role.query';
import {
  createApplication,
  findUnique as findApplication,
} from '../../src/query/application/application.query';
import { createResource } from '../../src/query/resource.query';
import { randomName } from './seed.shared';
import { debounceAsyncExecutor, nextId } from '../../src/utils';

/**
 * Seed role for APP *Root*
 */
const APP_NAME = 'Root';

/**
 * Seed the *Root* application
 */
const seedRootApp = () => {
  return createApplication(APP_NAME);
};

export const getApplication = async (): Promise<Application> =>
  (await findApplication({ name: APP_NAME })) ?? (await seedRootApp());

export const seedRole = async (): Promise<Role[]> => {
  const role = roleHierarchyList(50);
  const application = await getApplication();

  type Assignee = string;
  type RoleInput = Map<string, { name: string; applicationId: number }>;
  type RoleHierarchyInput = Map<string, Set<Assignee>>;
  const updateInput = [...role].reduce<[RoleInput, RoleHierarchyInput]>(
    ([role, hierarchy], fullname) => {
      const names = fullname.split(/\//g);
      names.forEach((name) => {
        role.set(name, {
          name,
          applicationId: application.id,
        });
      });
      names.reduceRight<string | undefined>((inherit, name) => {
        if (inherit === undefined) return name;
        hierarchy.set(inherit, (hierarchy.get(inherit) ?? new Set()).add(name));
        return name;
      }, undefined);
      return [role, hierarchy];
    },
    [new Map(), new Map()]
  );
  const roleCreated = await createRole([...updateInput[0].values()]);

  const executor = debounceAsyncExecutor<void>(50);
  updateInput[1].forEach((assignee, inherit) => {
    executor.add(() => inheritTo([...assignee], inherit, application.id));
  });
  await executor.finish();
  return roleCreated;
};

/**
 * Generate role name list
 */
export function roleHierarchyList(roleCount = 50): Iterable<string> {
  const roleFullName = new Set<string>();
  const randomRoleName = () =>
    randomName('/').replace(/^\/+|(?<=\/)\/+|\/+$/gi, '');
  for (let i = 0; i < roleCount; i++) {
    let newRole = randomRoleName();
    if (!newRole.includes('/')) newRole = `${newRole}/${randomRoleName()}`;
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
