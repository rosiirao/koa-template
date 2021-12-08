import {
  listRolesOfGroup,
  listRolesOfGroups,
  listRolesOfUser,
  listRoles,
  create,
  remove,
  update,
  find,
} from '../../../query/application/names.query/role.query';

import { ISubject } from '../../../app';

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
  subject: ISubject['subject'],
  pageOption?: Parameters<typeof listRoles>[1]
) {
  return listRoles(subject.applicationId, pageOption);
}

export function createRole(applicationId: number, data: { name: string }) {
  return create(applicationId, data);
}

export function getRole(id: number) {
  return find(id);
}

export function deleteRole(id: number) {
  return remove(id);
}

export function updateRole(id: number, data: { name: string }) {
  return update(id, data);
}
