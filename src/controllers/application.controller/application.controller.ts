import {
  EffectiveAssignee,
  listPrivilegeAssignments,
  modifyPrivilege,
  Privilege,
} from '../../query/application/privilege.query.js';
import {
  addApplication,
  findUnique,
  listApplication,
  modifyApplication,
  removeApplication,
} from '../../query/application/application.query.js';

export { listApplication };

export function getApplication(id?: string) {
  if (id === '' || id === undefined) {
    return listApplication();
  }
  if (!/^\d+$/.test(id)) {
    return;
  }
  return findUnique({ id: Number(id) });
}

/**
 *
 * @param data
 * @param creator The userId of the creator
 */
export function createApplication(data: { name: string }, creator: number) {
  return addApplication(data.name, creator);
}

export function updateApplication(
  id_name: { name: string } | { id: number },
  data: { name: string }
) {
  return modifyApplication(id_name, data);
}

export function deleteApplication(id_name: { name: string } | { id: number }) {
  return removeApplication(id_name);
}

export function getPrivileges(applicationId: number) {
  return listPrivilegeAssignments(applicationId);
}

export function updatePrivilege(
  applicationId: number,
  assignee: EffectiveAssignee,
  privilege: Array<Privilege>
) {
  return modifyPrivilege(applicationId, assignee, privilege);
}
