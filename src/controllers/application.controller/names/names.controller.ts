import {
  queryName,
  queryNames,
} from '../../../query/application/names.query/names.query';
import { ISubject } from '../../../app';

export const findNames = (
  subject: ISubject['subject'],
  options?: Parameters<typeof queryNames>[0],
  type?: string
) => {
  const { resourceId } = subject;

  if (!isResourceType(type)) return;

  if (resourceId === undefined) return queryNames(options, type);
  return queryName(resourceId, type);
};

function isResourceType(
  type?: string
): type is Parameters<typeof queryNames>[1] {
  return type === undefined || ['user', 'group', 'role'].includes(type);
}