import { Prisma, Privilege } from '.prisma/client';
import Router from '@koa/router';
import createHttpError from 'http-errors';
import Koa from 'koa';
import { listRolesOfUser } from '../../query/application/names.query/role.query';
import { listGroupsOfUser } from '../../query/group.query';
import { IIdentityState, AuthorizedState } from '../../app';
import { listPrivilegeAssignments } from '../../query/application/privilege.query';
import { findUnique } from '../../query/application/application.query';

/**
 * Get the authorized state to the application
 * @returns The state patch to AuthorizedState
 */
export async function authorizeApplicationState(
  applicationName: string,
  state: AuthorizedState,
  requestMethod: Router.RouterContext['method']
): Promise<Partial<AuthorizedState>> {
  const application = await findUnique({ name: applicationName });

  if (application == undefined) {
    throw createHttpError(404, `Application(${applicationName}) not found`);
  }

  const applicationId = application.id;
  const userId = state.identities?.id;
  if (userId === undefined)
    throw createHttpError(
      500,
      `The user's identities is empty, may authorize not be called before`
    );
  const roles = await listRolesOfUser(applicationId, userId);

  const statePatch = {
    subject: { applicationId },
    identities: {
      ...state.identities,
      role: [{ applicationId, grant: roles }],
    },
  };
  const privileges = await getPrivileges(applicationId, statePatch.identities);
  const subjectPrivilege = getSubjectPrivilege(requestMethod);

  // Require no privileges
  if (subjectPrivilege === Privilege.NONE) return statePatch;

  // Require privileges
  if (!containsPrivilege([...privileges], subjectPrivilege)) {
    throw createHttpError(
      403,
      `No permission to ${Privilege[subjectPrivilege]} on application(${applicationName})`
    );
  }
  return {
    ...statePatch,
    privilege: {
      applicationId,
      grant: [...privileges],
    },
  };
}

export async function loadApplicationByParam(
  applicationName: string,
  ctx: Koa.ParameterizedContext<AuthorizedState>,
  next: Koa.Next
) {
  const applicationState = await authorizeApplicationState(
    applicationName,
    ctx.state,
    ctx.method
  );
  ctx.state = {
    ...ctx.state,
    ...applicationState,
  };
  return next();
}

type Accessor = {
  reader: boolean;
  author: boolean;
  owner: boolean;
};
type ResourceACL = {
  UserACL: Array<Accessor & { userId: number }>;
  GroupACL: Array<Accessor & { groupId: number }>;
  RoleACL: Array<Accessor & { roleId: number }>;
} | null;

export function authorizeResourceState(
  findACL?: (resourceId: number) => ResourceACL | Promise<ResourceACL>
) {
  return async function (
    resourceId: number,
    state: AuthorizedState
  ): Promise<Partial<AuthorizedState>> {
    const subject = {
      ...state.subject,
      resourceId,
    };
    if (findACL === undefined) return { subject };

    const resource = await findACL(resourceId);

    const { UserACL = [], GroupACL = [], RoleACL = [] } = resource ?? {};
    if (UserACL.length === 0 && GroupACL.length === 0 && RoleACL.length === 0)
      return { subject };

    const applicationId = subject.applicationId;
    const privilege = new Set<Privilege>();
    const getPrivilegesFromACL = (
      acl: {
        reader?: boolean;
        author?: boolean;
      },
      privilege: Set<Privilege>
    ) => {
      if (acl.reader) privilege.add(Privilege.READ_RESOURCE);
      if (acl.author) privilege.add(Privilege.DELETE_RESOURCE);
    };

    const updateResourceState = (privilege: Set<Privilege>) => ({
      subject,
      privilege: {
        ...state.privilege,
        resource: {
          id: resourceId,
          grant: [...privilege],
        },
      },
    });

    let hasAllPrivilege = false;
    hasAllPrivilege =
      UserACL.find((acl) => {
        if (acl.userId === state.identities.id)
          getPrivilegesFromACL(acl, privilege);
        return privilege.size === 2;
      }) !== undefined;
    if (hasAllPrivilege) return updateResourceState(privilege);

    const group = [...(state.identities.group ?? [])];
    if (group.length > 0)
      hasAllPrivilege =
        GroupACL.find((acl) => {
          if (group.includes(acl.groupId)) getPrivilegesFromACL(acl, privilege);
          return privilege.size === 2;
        }) !== undefined;
    if (hasAllPrivilege) return updateResourceState(privilege);

    const role = new Set(
      [...(state.identities.role ?? [])].find(
        ({ applicationId: id }) => applicationId === id
      )?.grant
    );
    if (role.size > 0)
      hasAllPrivilege =
        RoleACL.find((acl) => {
          if (role.has(acl.roleId)) getPrivilegesFromACL(acl, privilege);
          return privilege.size === 2;
        }) !== undefined;

    return updateResourceState(privilege);
  };
}

export function loadResourceByParam(
  findACL?: (resourceId: number) => ResourceACL | Promise<ResourceACL>
) {
  return async function loadResourceByParam(
    resourceIdParam: string,
    ctx: Koa.ParameterizedContext<AuthorizedState>,
    next: Koa.Next
  ) {
    if (resourceIdParam === undefined || resourceIdParam === '') return next();
    const resourceId = Number(resourceIdParam);
    if (isNaN(resourceId)) throw createHttpError(400, 'Resource id is illegal');

    ctx.state = {
      ...ctx.state,
      ...(await authorizeResourceState(findACL)(resourceId, ctx.state)),
    };
    return next();
  };
}

type UserIdentity = {
  id: number;
  group?: Array<number>;
  role?: Array<number>;
};

export type ACL<T = Privilege> = {
  resource: {
    application: number;
    id: number;
  };
  user: UserIdentity;
  privilege: Prisma.Enumerable<T>;
};

export async function getPrivileges(
  applicationId: number,
  identities: IIdentityState['identities']
) {
  const privilegeAssignments = await listPrivilegeAssignments(applicationId);
  type T = 'User' | 'Group' | 'Role';
  const identityKeys: T[] = ['User', 'Group', 'Role'];

  const assignmentsByKey = {
    Role: privilegeAssignments?.Role.map(({ id, PrivilegeAssignment }) => ({
      id,
      privilege: PrivilegeAssignment.map(({ privilege }) => privilege),
    })),
    Group: privilegeAssignments?.PrivilegeGroupAssignment.map(
      ({ groupId: id, privilege }) => ({ id, privilege: [privilege] })
    ),
    User: privilegeAssignments?.PrivilegeUserAssignment.map(
      ({ userId: id, privilege }) => ({ id, privilege: [privilege] })
    ),
  };

  function privilegeOnKey(key: T) {
    const identityOnKey =
      key === 'User'
        ? identities.id
        : key === 'Group'
        ? identities.group
        : key === 'Role'
        ? [...identities.role].find(
            ({ applicationId: id }) => applicationId === id
          )?.grant
        : undefined;
    if (identityOnKey === undefined) return;

    const assignment = assignmentsByKey[key];

    if (assignment === undefined) return;
    return assignment?.reduce<Set<Privilege>>((acc, assignmentItem) => {
      if (assignmentItem === undefined) return acc;
      if (
        typeof identityOnKey === 'number'
          ? identityOnKey === assignmentItem.id
          : [...identityOnKey].includes(assignmentItem.id)
      )
        assignmentItem.privilege.forEach((p) => acc.add(p));
      return acc;
    }, new Set());
  }
  return identityKeys.reduce<Set<Privilege>>((acc, identityKey) => {
    const privileges = privilegeOnKey(identityKey);
    if (privileges === undefined) return acc;
    for (const p of privileges) {
      acc.add(p);
    }
    return acc;
  }, new Set());
}

export const authorize: Router.Middleware<AuthorizedState> = async (
  ctx,
  next
) => {
  const { id } = ctx.state.user;
  if (id === undefined) {
    throw createHttpError(401);
  }
  const groups = await listGroupsOfUser(id);

  ctx.state.identities = {
    id,
    role: [],
    group: groups,
  };

  return next();
};

export function grant(
  object: {
    applicationId: number;
    resourceId?: number;
    action: Privilege;
  },
  userId: number
) {
  const { applicationId, resourceId } = object;
  // get roles of application
  // await get role of application

  // await get user identities
  // get

  if (resourceId === undefined) {
    // list all
  }

  return [applicationId, resourceId, userId];
}

function getSubjectPrivilege(requestMethod: Router.RouterContext['method']) {
  const privilegeOnRequestMethod = {
    GET: Privilege.READ_RESOURCE,
    POST: Privilege.CREATE_RESOURCE,
    PUT: Privilege.MODIFY_RESOURCE,
    PATCH: Privilege.MODIFY_RESOURCE,
    DELETE: Privilege.DELETE_RESOURCE,
    ALL: Privilege.NONE,
    '*': Privilege.NONE,
  } as Record<string, Privilege>;
  return (
    privilegeOnRequestMethod[requestMethod] ?? privilegeOnRequestMethod['*']
  );
}

function comparePrivilege(privilege: Privilege, compared: Privilege) {
  const order = [
    Privilege.NONE,
    Privilege.READ_RESOURCE,
    Privilege.CREATE_RESOURCE,
    Privilege.MODIFY_RESOURCE,
    Privilege.DELETE_RESOURCE,
  ];
  return order.indexOf(privilege) - order.indexOf(compared);
}

function containsPrivilege(privileges: Array<Privilege>, compared: Privilege) {
  return privileges.some((p) => comparePrivilege(p, compared) >= 0);
}
