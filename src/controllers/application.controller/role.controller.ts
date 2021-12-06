import {
  listRolesOfGroup,
  listRolesOfGroups,
  listRolesOfUser,
} from '../../query/application/role.query';

export async function getUserRoles(applicationId: number, userId: number) {
  const roles = await listRolesOfUser(applicationId, userId);
  return roles;
}

export async function getGroupRoles(applicationId: number, groupId: number) {
  const roles = await listRolesOfGroup(applicationId, groupId);
  return roles;
}

export async function getGroupsRoles(
  applicationId: number,
  groups: Array<number>
) {
  const roles = await listRolesOfGroups(applicationId, groups);
  return roles;
}
