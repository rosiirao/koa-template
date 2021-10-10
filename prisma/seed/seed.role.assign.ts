import { Group, Prisma, PrismaPromise } from '.prisma/client';
import { countRoot, getGroup, listRoot } from '../../src/query/group.query';
import {
  assignGroup,
  assignUser,
  countRole,
  listRole,
} from '../../src/query/role.query';
import { countUser, listUser } from '../../src/query/user.query';
import { debounceAsyncExecutor } from '../../src/utils';
import { getApplication } from './seed.role';
import {
  getRandomArbitrary,
  randomPick,
  SeedExecutorQuota,
} from './seed.shared';

/**
 * assign role to users and groups
 */
export async function seedRoleAssign(): Promise<Prisma.BatchPayload> {
  const application = await getApplication();
  const [user, group, role] = await Promise.all([
    listUser(await countUser()),
    listGroup(),
    listRole(application.id, await countRole()),
  ]);

  const userPerRole = Math.ceil(role.length / user.length) + 20;

  const asyncExecutor =
    debounceAsyncExecutor<Prisma.BatchPayload>(SeedExecutorQuota);

  role.forEach(({ id: roleId }) => {
    const [assigneeUser] = randomPick(
      user,
      getRandomArbitrary(userPerRole, Math.ceil(userPerRole / 2))
    );

    const [assigneeGroup] = randomPick(
      group,
      getRandomArbitrary(userPerRole, Math.ceil(userPerRole / 2))
    );

    asyncExecutor.add(() =>
      assignUser(
        roleId,
        assigneeUser.map(({ id }) => id)
      )
    );

    asyncExecutor.add(() =>
      assignGroup(
        roleId,
        assigneeGroup.map(({ id }) => id)
      )
    );
  });

  return asyncExecutor
    .finish()
    .then((queue) =>
      queue.reduce<Prisma.BatchPayload>(
        (acc, { count }) => ({ count: acc.count + count }),
        { count: 0 }
      )
    );
}

function getGroupWithMember(
  id: number
): PrismaPromise<(Group & { unit: Array<{ memberId: number }> }) | null> {
  return getGroup(id, {
    unit: { select: { memberId: true } },
  }) as PrismaPromise<(Group & { unit: Array<{ memberId: number }> }) | null>;
}

async function listGroup() {
  const root = await listRoot(await countRoot());
  const layer: Array<{ id: number }> = [];
  let lastLayer: Array<{ id: number }> = root;
  while (lastLayer.length > 0) {
    layer.push(...lastLayer);
    lastLayer = (
      await Promise.all(lastLayer.map(({ id }) => getGroupWithMember(id)))
    ).reduce<Array<{ id: number }>>((acc, group) => {
      const { unit } = group ?? {};
      if (unit === undefined) return acc;
      return acc.concat(unit.map(({ memberId }) => ({ id: memberId })));
    }, []);
  }
  return layer;
}
