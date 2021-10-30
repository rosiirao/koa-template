import { Prisma } from '.prisma/client';
import Koa from 'koa';
/**
 *
 * @returns The application current context want to access
 */
function getApplication(context: Koa.Context) {
  return 1;
}

/**
 *
 * @returns The resource current context want to access
 */
function getResource(context: Koa.Context) {
  return {
    application: getApplication(context),
    id: 1,
  };
}

type UserIdentity = {
  id: number;
  group?: Array<number>;
  role?: Array<number>;
};

enum Privilege {
  None,
  Create,
  Delete,
  Write,
  Read,
}

export type ACL<T = Privilege> = {
  resource: {
    application: number;
    id: number;
  };
  user: UserIdentity;
  privilege: Prisma.Enumerable<T>;
};

export function getResourcePrivilege(resource: number): ACL {
  return {
    resource: {
      application: 1,
      id: 1,
    },
    user: { id: 1 },
    privilege: Privilege.None,
  };
}
