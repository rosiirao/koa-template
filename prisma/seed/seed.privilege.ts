import { Prisma, Privilege } from '@prisma/client';
import { listRoles } from '../../src/query/application/names.query/role.query';
import { listUsers } from '../../src/query/user.query';
import { assignPrivilege } from '../../src/query/application/privilege.query';
import {
  AsyncExecutor,
  debounceAsyncExecutor,
  rangeList,
  ThenArg,
} from '../../src/utils';
import { getApplication } from './seed.role';
import { findMember, listRoot } from '../../src/query/group.query';
import { aclCriteria, randomPick } from './seed.shared';

const priv = [
  Privilege.CREATE_RESOURCE,
  Privilege.CREATE_RESOURCE,
  [Privilege.READ_RESOURCE, Privilege.MODIFY_RESOURCE],
  [Privilege.READ_RESOURCE, Privilege.DELETE_RESOURCE],
] as Prisma.Enumerable<Privilege[]>;

/**
 * all roles in db
 */
const listAllRole = async () => {
  const { id: applicationId } = await getApplication();
  const accCount = 1_00;
  let role = [] as ThenArg<typeof listRoles>,
    nextRole: typeof role;
  while (
    (nextRole = await listRoles(applicationId, {
      start: (role.at(-1)?.id ?? 0) + 1,
      count: accCount,
    })).length > 0
  ) {
    role = role.concat(nextRole);
  }
  return role;
};

const listAllGroupRoot = async () => {
  const fetchCount = 50;
  let root = [] as ThenArg<typeof listRoot>,
    nextRoot: typeof root;
  while (
    (nextRoot = await listRoot(fetchCount, { skip: root.length })).length > 0
  ) {
    root = root.concat(nextRoot);
  }
  return root;
};

const listAllUser = async () => {
  const fetchCount = 50;
  let user = [] as ThenArg<typeof listUsers>,
    nextUser: typeof user;
  while (
    (nextUser = await listUsers(aclCriteria, fetchCount, { skip: user.length }))
      .length > 0
  ) {
    user = user.concat(nextUser);
  }
  return user;
};

/**
 * Randomly assign the privilege to the identity list
 */
const assignToIdentityRandom = async (
  identityKey: keyof Parameters<typeof assignPrivilege>[0],
  identityList: Array<{ id: number }>,
  executor: AsyncExecutor<Prisma.BatchPayload>,
  privilege = priv
) => {
  if (privilege.length === 0) return;
  let listRest = identityList;
  rangeList(privilege.length, (index) => {
    if (identityList.length === 0) return;
    const [got, rest] = randomPick(
      listRest,
      Math.ceil(identityList.length / priv.length)
    );
    executor.add(() =>
      assignPrivilege(
        {
          [identityKey]: got.map(({ id }) => id),
        },
        privilege[index]
      )
    );
    listRest = rest;
  });
};

export async function seedPrivilege(): Promise<Prisma.BatchPayload> {
  const role = await listAllRole();

  const executor = debounceAsyncExecutor<Prisma.BatchPayload>(50);
  assignToIdentityRandom('role', role, executor);

  const group = await listAllGroupRoot();
  const assignRatio = 4;
  // Recursively downward to randomly pick some from every layer
  const assignGroupLayer = async (group: Array<{ id: number }>) => {
    const [some] = randomPick(group, Math.ceil(group.length / assignRatio));

    assignToIdentityRandom('group', some, executor);
    group.forEach(async ({ id }) => {
      findMember(id).then((member) => {
        if (member.length === 0) return;
        assignGroupLayer(member.map(({ memberId: id }) => ({ id })));
      });
    });
  };

  assignGroupLayer(group);

  const user = await listAllUser();
  const [some, userRest] = randomPick(
    user,
    Math.ceil(user.length / assignRatio)
  );
  assignToIdentityRandom('user', some, executor);

  // assign some users with Privilege.None
  const [userWithNone] = randomPick(userRest, 4);
  assignToIdentityRandom('user', userWithNone, executor, [Privilege.NONE]);

  return executor
    .finish()
    .then((batch) =>
      batch.reduce<Prisma.BatchPayload>(
        (acc, { count }) => ({ count: acc.count + count }),
        { count: 0 }
      )
    );
}
