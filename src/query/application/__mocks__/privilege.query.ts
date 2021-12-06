// import { IIdentityState } from '../../../app';

import { Privilege } from '.prisma/client';

export function listPrivilegeAssignments() {
  // applicationId: number,
  // identities: IIdentityState['identities']
  return {
    PrivilegeRoleAssignment: [
      {
        privilege: Privilege.NONE,
        roleId: 1,
      },
      {
        privilege: Privilege.NONE,
        roleId: 999,
      },
      {
        privilege: Privilege.MODIFY_RESOURCE,
        roleId: 999,
      },
    ],
    PrivilegeGroupAssignment: [
      {
        privilege: Privilege.NONE,
        groupId: 1,
      },
      {
        privilege: Privilege.NONE,
        groupId: 999,
      },
      {
        privilege: Privilege.MODIFY_RESOURCE,
        groupId: 999,
      },
    ],
    PrivilegeUserAssignment: [
      {
        privilege: Privilege.DELETE_RESOURCE,
        userId: 1,
      },
      {
        privilege: Privilege.NONE,
        userId: 999,
      },
      {
        privilege: Privilege.MODIFY_RESOURCE,
        userId: 999,
      },
    ],
  };
}
