import { Prisma, Privilege } from '@prisma/client';
import { listRole } from '../../src/query/role.query';
import { findAll as findAllUser } from '../../src/query/user.query';
import { assignPrivilege } from '../../src/query/privilege.query';
import {
  AsyncExecutor,
  debounceAsyncExecutor,
  randomArbitrary,
  rangeList,
  ThenArg,
} from '../../src/utils';
import { getApplication } from './seed.role';
import { findMember, findRoot } from '../../src/query/group.query';

const priv = [
  Privilege.CREATE_RESOURCE,
  Privilege.CREATE_RESOURCE,
  [Privilege.READ_RESOURCE, Privilege.MODIFY_RESOURCE],
  [Privilege.READ_RESOURCE, Privilege.DELETE_RESOURCE],
] as Prisma.Enumerable<Privilege[]>;

// randomly pick the roles to assign different privilege
function listPickRandom<T>(
  list: Array<T>,
  count: number
): [got: Array<T>, rest: Array<T>] {
  if (count <= 0)
    throw new Error(`The number to pick must be positive, got (${count})`);
  if (count >= list.length) return [list, []];
  const got = [] as typeof list,
    rest = [...list];

  rangeList(count, () => {
    const index = randomArbitrary(rest.length);
    got.push(...rest.splice(index, 1));
  });
  return [got, rest];
}

/**
 * all roles in db
 */
const listAllRole = async () => {
  const { id: applicationId } = await getApplication();
  const accCount = 1_00;
  let role = [] as ThenArg<typeof listRole>,
    nextRole: typeof role;
  while (
    (nextRole = await listRole(applicationId, accCount, {
      start: (role.at(-1)?.id ?? 0) + 1,
    })).length > 0
  ) {
    role = role.concat(nextRole);
  }
  return role;
};

const listAllGroupRoot = async () => {
  const fetchCount = 50;
  let root = [] as ThenArg<typeof findRoot>,
    nextRoot: typeof root;
  while (
    (nextRoot = await findRoot(fetchCount, { skip: root.length })).length > 0
  ) {
    root = root.concat(nextRoot);
  }
  return root;
};

const listAllUser = async () => {
  const fetchCount = 50;
  let user = [] as ThenArg<typeof findAllUser>,
    nextUser: typeof user;
  while (
    (nextUser = await findAllUser(fetchCount, { skip: user.length })).length > 0
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
    const [got, rest] = listPickRandom(
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
    const [some] = listPickRandom(group, Math.ceil(group.length / assignRatio));

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
  const [some, userRest] = listPickRandom(
    user,
    Math.ceil(user.length / assignRatio)
  );
  assignToIdentityRandom('user', some, executor);

  // assign some users with Privilege.None
  const [userWithNone] = listPickRandom(userRest, 4);
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
