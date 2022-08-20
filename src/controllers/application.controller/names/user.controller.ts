import type { User } from '@prisma/client';
import type { ISubject, IIdentityState } from '../../../app.js';
import {
  listUsers as queryUsers,
  findUnique as queryUser,
  updateUser as patchUser,
} from '../../../query/user.query.js';

export const findUser = async (
  subject: ISubject['subject'],
  identities: IIdentityState['identities']
) => {
  const { applicationId, resourceId } = subject;
  if (resourceId === undefined) {
    const allUsers = await queryUsers({
      identities,
      applicationId,
    });
    return allUsers;
  }
  const user = await queryUser({ id: Number(resourceId) });
  return user;
};

export const updateUser = (id: number, user: User) => {
  return patchUser(id, user);
};
