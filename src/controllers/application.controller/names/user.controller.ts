import { User } from '.prisma/client';
import { ISubject, IIdentityState } from '../../../app';
import {
  listUsers as queryUsers,
  findUnique as queryUser,
  updateUser as patchUser,
} from '../../../query/user.query';

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
