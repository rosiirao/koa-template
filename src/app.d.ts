import type { Privilege } from '.prisma/client';

export interface IUserState {
  user: Partial<{
    name: string;
    id: number;
  }>;
}

export interface IIdentityState {
  identities: {
    id: number;
    role: Iterable<{ applicationId: number; grant: Iterable<number> }>;
    group: Iterable<number>;
  };
}

/**
 * The resource subject of the uri
 */
export interface ISubject {
  subject: {
    applicationId: number;
    resourceId?: number;
  };
}

export interface IPrivilege {
  privilege: {
    applicationId: number;
    grant: Array<Privilege>;
    resource?: {
      id: number;
      grant: Array<Privilege>;
    };
  };
}

export type AuthorizedState = IUserState &
  IIdentityState &
  ISubject &
  IPrivilege;
