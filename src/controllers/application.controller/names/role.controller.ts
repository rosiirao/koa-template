import {
  listRolesOfGroup,
  listRolesOfGroups,
  listRolesOfUser,
  listRoles,
  create,
  remove,
  update,
  find,
  inheritToById,
  revokeInherit,
} from '../../../query/application/names.query/role.query';

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

export function findRoles(
  applicationId: number,
  pageOption?: Parameters<typeof listRoles>[1]
) {
  return listRoles(applicationId, pageOption);
}

export function createRole(data: { name: string }, applicationId: number) {
  return create(applicationId, data);
}

export function getRole(id: number, applicationId?: number) {
  return find(id, applicationId);
}

export function deleteRole(id: number, applicationId?: number) {
  return remove(id, applicationId);
}

export function updateRole(
  id: number,
  data: { name: string },
  applicationId?: number
) {
  return update(id, data, applicationId);
}

export function inheritRole(id: number, inheritTo: number) {
  return inheritToById(id, inheritTo);
}

export function deleteInheritRole(id: number, inheritTo: number) {
  return revokeInherit(id, inheritTo);
}
