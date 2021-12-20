import { Privilege } from '@prisma/client';
import { Prisma } from '@prisma/client';
import prisma from '../client';
import { enumerableFlat } from '../query.shared';

export { Privilege } from '@prisma/client';

export type EffectiveAssignee = {
  user?: Prisma.Enumerable<number>;
  group?: Prisma.Enumerable<number>;
  role?: Prisma.Enumerable<number>;
};

export async function assignPrivilege(
  assignee: EffectiveAssignee,
  priv: Prisma.Enumerable<Privilege>
): Promise<Prisma.BatchPayload> {
  // re assemble the data structure
  type PrivilegeCreateInput<T extends keyof EffectiveAssignee> =
    Prisma.Enumerable<
      {
        [key in `${T}Id`]?: number;
      } & { privilege: Privilege }
    >;

  const createInput = (
    Object.keys(assignee) as Array<keyof EffectiveAssignee>
  ).reduce<{
    [key in keyof EffectiveAssignee]?: PrivilegeCreateInput<key>;
  }>((acc, key) => {
    enumerableFlat(priv).forEach((privilege) => {
      enumerableFlat(assignee[key]).forEach((id) => {
        const item = {
          [`${key}Id`]: id,
          privilege,
        } as PrivilegeCreateInput<typeof key>;
        return Object.assign(acc, {
          [key]: enumerableFlat(acc[key] ?? []).concat(item),
        });
      });
    });
    return acc;
  }, {});

  const createAssignDelegate: {
    [key in keyof EffectiveAssignee]-?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createMany: (...args: any[]) => Promise<Prisma.BatchPayload>;
    };
  } = {
    user: prisma.privilegeUserAssignment,
    group: prisma.privilegeGroupAssignment,
    role: prisma.privilegeRoleAssignment,
  };

  const assign = Object.keys(createInput)
    .map((key) =>
      createAssignDelegate[key as keyof EffectiveAssignee].createMany({
        data: createInput[key as keyof EffectiveAssignee],
        skipDuplicates: true,
      })
    )
    .flat();

  const payload = await Promise.all(assign);
  return payload.reduce<Prisma.BatchPayload>(
    (acc_1, { count }) => ({ count: count + acc_1.count }),
    { count: 0 }
  );
}

export async function modifyPrivilege(
  applicationId: number,
  assignee: EffectiveAssignee,
  priv: Prisma.Enumerable<Privilege>
) {
  const { user, group, role } = {
    user: enumerableFlat(assignee.user),
    group: enumerableFlat(assignee.group),
    role: enumerableFlat(assignee.role),
  };
  const privilege = enumerableFlat(priv);

  type K = 'userId' | 'groupId' | 'roleId';
  type PrivCreateInput = { [key in K]: number } & { privilege: Privilege };
  function assemblePrivilege(idList: Array<number>, idName: K) {
    return idList.reduce<Array<PrivCreateInput>>((acc, id) => {
      privilege.forEach((p) =>
        acc.push({ [idName]: id, privilege: p } as PrivCreateInput)
      );
      return acc;
    }, []);
  }

  function createManyInput(idList: Array<number>, idName: K) {
    return {
      skipDuplicates: true,
      data: assemblePrivilege(idList, idName),
    };
  }

  const update = [];
  if (enumerableFlat(user).length > 0 || enumerableFlat(group).length > 0) {
    update.push(
      prisma.application.update({
        where: { id: applicationId },
        data: {
          PrivilegeUserAssignment: {
            deleteMany: {
              userId: { in: user },
              privilege: { notIn: privilege },
            },
            createMany: createManyInput(user, 'userId'),
          },
          PrivilegeGroupAssignment: {
            deleteMany: {
              groupId: { in: group },
              privilege: { notIn: privilege },
            },
            createMany: createManyInput(group, 'groupId'),
          },
        },
      })
    );
  }
  if (role.length > 0) {
    update.push(
      prisma.privilegeRoleAssignment.deleteMany({
        where: {
          role: {
            applicationId,
            id: { in: role },
          },
          privilege: { notIn: privilege },
        },
      }),
      prisma.privilegeRoleAssignment.createMany(createManyInput(role, 'roleId'))
    );
  }
  return prisma.$transaction(update);
}

export async function listPrivilegeAssignments(applicationId: number) {
  const found = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      PrivilegeGroupAssignment: { select: { groupId: true, privilege: true } },
      PrivilegeUserAssignment: { select: { userId: true, privilege: true } },
      Role: {
        select: {
          id: true,
          Privilege: {
            select: { privilege: true },
          },
        },
      },
    },
  });
  return found;
}
