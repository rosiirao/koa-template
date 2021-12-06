import { IIdentityState } from '../../app';

const noRelationClause = { none: {} };

export function aclClause(
  identities: IIdentityState['identities'],
  applicationId: number
) {
  const { id, group, role } = identities;
  const noClause = {
    UserACL: noRelationClause,
    GroupACL: noRelationClause,
    RoleACL: noRelationClause,
  };
  const roleInApplication =
    [...role].find(({ applicationId: id }) => applicationId === id)?.grant ??
    [];
  return {
    OR: [
      noClause,
      {
        UserACL: {
          some: {
            id,
          },
        },
        GroupACL: {
          some: {
            id: {
              in: [...group],
            },
          },
        },
        RoleACL: {
          some: {
            id: {
              in: [...roleInApplication],
            },
          },
        },
      },
    ],
  };
}

export function aclRelationClause<T extends string>(
  identities: IIdentityState['identities'],
  applicationId: number,
  aclRelationName: T
) {
  const clause = aclClause(identities, applicationId);
  type Clause = Record<T, typeof clause | null>;
  return {
    OR: [
      { [aclRelationName]: null },
      { [aclRelationName]: clause },
    ] as Array<Clause>,
  };
}
