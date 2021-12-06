import { Prisma, Group, User, PrismaPromise } from '@prisma/client';

import { Element, ThenArg } from '../utils';

import prisma from './client';

import {
  hierarchyByName,
  DEFAULT_ROW_COUNT,
  queryInput,
  FullName,
  enumerableIsEmpty,
  itemOfEnumerable,
  enumerableFlat,
} from './query.shared';

/**
 * The map of group's FullName and id
 */
export type MappedGroup = Record<
  FullName,
  Prisma.Enumerable<
    Partial<
      Group & { unit: { memberId: number }[]; member: { unitId: number }[] }
    > & { id: number }
  >
>;

/**
 * Create by full name, if unitId is missing and the unit has found many, then fist one is select as the unit.
 * If the unit is not match, throw an error
 */
export const create = async (
  fullname: FullName,
  unitId?: number
): Promise<Element<MappedGroup>> => {
  const hierarchy = hierarchyByName(fullname);

  const groupMap = await findGroupMapByName(fullname, { selfUnit: true });

  const [inputName, inputUnitId] = [fullname, unitId];

  const group = await hierarchy.reduce<
    Promise<Prisma.Enumerable<Element<MappedGroup>> | undefined>
  >(async (created, fullname) => {
    const lastGroup = await created;

    const createdBefore = groupMap[fullname];
    // skip level beyond if the input unitId is indicated.
    if (fullname !== inputName && inputUnitId !== undefined) {
      return createdBefore;
    }

    const name = fullname.replace(/\/.+$/gi, '');
    const root = name === fullname && lastGroup === undefined;

    if (!root && enumerableIsEmpty(lastGroup)) {
      throw new Error(`Can't get upper group when create (${fullname})`);
    }

    // return the name created if not the bottom
    // the bottom level need check the inputUnitId after, so only return on the level not bottom
    if (
      !enumerableIsEmpty(createdBefore) &&
      (fullname !== inputName || inputUnitId === undefined)
    )
      return createdBefore;

    // check the input unit id and the created unit matched.
    if (inputUnitId !== undefined) {
      if (root)
        throw new Error(
          `The root (${inputName}) you want created must have a unitId (${inputUnitId})`
        );

      if (enumerableIsEmpty(lastGroup))
        throw new Error(
          `Can't create the group (${inputName}), the unitId (${inputUnitId}) indicated not found`
        );

      // verify lastGroup match the unit
      if (enumerableFlat(lastGroup).every(({ id }) => id !== inputUnitId))
        throw new Error(
          `Can't create the group (${inputName}), the unitId (${inputUnitId}) indicated not found`
        );

      const created = enumerableFlat(createdBefore).find(({ member }) =>
        member?.some(({ unitId }) => unitId === inputUnitId)
      );
      if (created !== undefined) return created;
    }

    const lastId = root
      ? undefined
      : inputUnitId ?? itemOfEnumerable(lastGroup!)!.id; // lastGroup pass enumerableIsEmpty must not be empty

    const group = prisma.group.create({
      data: {
        name,
        ...(root
          ? undefined
          : {
              member: {
                create: {
                  unitId: lastId!,
                },
              },
            }),
        Resource: { create: {} },
      },
      select: {
        id: true,
      },
    });
    return group;
  }, Promise.resolve(undefined));

  if (group === undefined) {
    throw new Error(`Create group (${fullname}) get unknown error`);
  }

  if (Array.isArray(group)) {
    if (group.length > 1) {
      throw new Error(
        `Creat group meet unknown error, re-check the group inherit needed!`
      );
    }
    return group[0];
  }

  return group;
};

/**
 * Create by full name, if the top has found, then only create inherit the first,
 * the function doesn't support indicate the unit.
 */
export const createMany = async (
  group: Array<FullName>
): Promise<Prisma.BatchPayload> => {
  /**
   *  Group level array, the root Set is the first element
   */
  type GroupByLevels = Array<Set<FullName>>;

  const [groupByLevels, groupCreatedWait] = group.reduce<
    [GroupByLevels, Array<Promise<MappedGroup>>]
  >(
    ([groupByLevels, groupFindWait], fullname) => {
      groupFindWait.push(findGroupMapByName(fullname));
      const hierarchy = hierarchyByName(fullname);
      hierarchy.forEach((name, level) => {
        const group = (groupByLevels[level] ??= new Set());
        group.add(name);
      });
      return [groupByLevels, groupFindWait];
    },
    [[new Set()], []]
  );

  /**
   * all group created
   */
  const createdBefore: MappedGroup = await (
    await Promise.all(groupCreatedWait)
  ).reduce<MappedGroup>((created, item) => {
    return { ...created, ...item };
  }, {});

  const created = await groupByLevels.reduce<
    Promise<Array<Array<Promise<MappedGroup>>>>
  >(async (created, layer) => {
    const lastLayer = (await created).at(-1);
    const layerCreated: Element<ThenArg<typeof created>> = [];

    // every layer need wait last layer created completely
    if (lastLayer !== undefined) {
      (await Promise.all(lastLayer)).forEach((map) => {
        Object.assign(createdBefore, map);
      });
    }

    layer.forEach((value) => {
      const fullname = value;
      if (createdBefore[fullname] !== undefined) return;

      const [name, lastName] = fullname.split(/(?<=^[^/]+)\//);
      const root = name === fullname;
      const lastId = itemOfEnumerable(createdBefore[lastName]);
      if (!root && lastId === undefined) {
        throw new Error(`Create group (${fullname}) get unknown error`);
      }

      layerCreated.push(
        prisma.group
          .create({
            data: {
              name,
              ...(root
                ? undefined
                : {
                    member: {
                      create: {
                        unitId: lastId!.id,
                      },
                    },
                  }),
              Resource: { create: {} },
            },
            select: {
              id: true,
            },
          })
          .then((group) => ({ [fullname]: group }))
      );
    });
    (await created).push(layerCreated);
    return created;
  }, Promise.resolve([]));

  return { count: created.flat().length };
};

export const inherit = async (
  data: Prisma.Enumerable<{
    unitId: number;
    memberId: number;
  }>
): Promise<Prisma.BatchPayload> => {
  return prisma.groupInherit.createMany({
    data,
  });
};

const rootCriteria = {
  member: {
    none: {},
  },
};

export const listGroupsOfUser = async (
  userId: number
): Promise<Iterable<Group['id']>> => {
  const groupFind = await prisma.group.findMany({
    where: {
      user: {
        some: {
          userId,
        },
      },
    },
    select: {
      id: true,
    },
  });
  // Group has the inherit map, so need find
  const group = new Set(groupFind?.map(({ id }) => id));
  let currentGroup = [...group];

  const filterAndAppend = (id: number) => {
    const repeated = group.has(id);
    if (repeated) return false;
    group.add(id);
    return true;
  };
  while (currentGroup.length > 0) {
    const inherit = await prisma.groupInherit.findMany({
      where: {
        memberId: {
          in: currentGroup,
        },
      },
      select: {
        unitId: true,
      },
    });
    currentGroup = [
      ...new Set(inherit.map(({ unitId }) => unitId).flat()),
    ].filter(filterAndAppend);
  }
  return group;
};

export const findGroupMapByName = async (
  fullname: FullName,
  option?: {
    selfUnit?: boolean;
    selfMember?: boolean;
  }
): Promise<MappedGroup> => {
  const hierarchy = hierarchyByName(fullname);
  const inputName = fullname;
  const { selfMember = false, selfUnit = false } = option ?? {};

  const groupMap = hierarchy.reduce<Promise<MappedGroup>>(
    async (groupFind, fullname) => {
      const map = await groupFind;
      const [name, lastName] = fullname.split(/(?<=^[^/]+)\//);
      const root = name === fullname && lastName === undefined;
      if (lastName === undefined && !root) {
        return map;
      }
      const lastGroup = map[lastName];
      if (lastGroup === undefined && !root) return map; // the last layer is not found, do nothing and return

      const find = await prisma.group.findMany({
        where: {
          name,
          ...(root
            ? rootCriteria
            : {
                member: {
                  every: {
                    unitId: {
                      in: enumerableFlat(lastGroup).map(({ id }) => id),
                    },
                  },
                },
              }),
        },
        select: {
          id: true,
          ...(selfUnit && fullname === inputName
            ? { member: { select: { unitId: true } } }
            : undefined),
          ...(selfMember && fullname === inputName
            ? { unit: { select: { memberId: true } } }
            : undefined),
        },
      });

      if (find.length === 0) {
        return map;
      }
      const found = map[fullname];
      if ((found !== undefined && 'length' in found) || find.length > 1) {
        /** only one record found */
        map[fullname] = ([] as Array<Element<MappedGroup>>).concat(
          found ?? [],
          find
        );
        return map;
      }
      map[fullname] = find[0];
      return map;
    },
    Promise.resolve({})
  );

  return groupMap;
};

export const findMember = async (
  unitId: number
): Promise<Array<{ memberId: number }>> => {
  return prisma.groupInherit.findMany({
    where: {
      unitId,
    },
    select: {
      memberId: true,
    },
  });
};

export const listRoot = async (
  count = DEFAULT_ROW_COUNT,
  option = {} as {
    start?: number;
    skip?: number;
  }
): Promise<Array<Element<MappedGroup>>> => {
  const { start = 1, skip = 1 } = option;
  return prisma.group.findMany({
    where: rootCriteria,
    ...queryInput('skip', skip, skip > 1),
    ...queryInput(
      'cursor',
      start > 1
        ? {
            id: start,
          }
        : undefined
    ),
    take: count,
  });
};

export function countRoot(): PrismaPromise<number> {
  return prisma.group.count({
    where: rootCriteria,
  });
}

export function getGroup(
  id: number,
  criteria?: Prisma.GroupSelect
): PrismaPromise<Group | null> {
  return prisma.group.findUnique({
    where: { id },
    ...queryInput('select', criteria),
  });
}

export async function getGroupFullName(
  id: number
): Promise<Prisma.Enumerable<{ fullname: FullName; id: number[] }>> {
  type GroupWithUnit = {
    id: number;
    name: string;
    member: Record<'unitId', number>[];
  };
  const group = (await getGroup(id, {
    id: true,
    name: true,
    member: { select: { unitId: true } },
  })) as GroupWithUnit | null;
  if (group === null) {
    throw new Error(
      `GetGroupFullName meet error: the group of id (${id}) not found`
    );
  }
  if (group === null || group?.member.length === 0) {
    return { id: [group.id], fullname: group.name };
  }
  const unit = await Promise.all(
    group.member.map(({ unitId }) => getGroupFullName(unitId))
  );
  const { name } = group;
  const fullname = unit
    .map((u) => {
      const joinUnit = ({
        id: unitId,
        fullname,
      }: Element<Record<never, typeof u>>) => ({
        id: (unitId.push(id), unitId),
        fullname: `${name}/${fullname}`,
      });
      if (Array.isArray(u)) {
        return u.map(joinUnit);
      }
      return joinUnit(u);
    })
    .flat();
  return fullname.length === 1 ? fullname[0] : fullname;
}

export async function getGroupMember(
  id: number
): Promise<Element<MappedGroup> | null> {
  type GroupWithMember = {
    id: number;
    name: string;
    unit: Record<'memberId', number>[];
  };
  const group = (await getGroup(id, {
    id: true,
    name: true,
    unit: { select: { memberId: true } },
  })) as GroupWithMember | null;
  if (group === null) {
    throw new Error(`The group with id (${id}) not found`);
  }
  return group;
}

export async function remove(
  name: FullName,
  option = {
    recursive: false,
  }
): Promise<Prisma.BatchPayload> {
  const groupMap = await findGroupMapByName(name, { selfMember: true });
  const group = itemOfEnumerable(groupMap[name]);
  if (group === undefined) return { count: 0 };

  const { unit, id } = group;
  if ((unit?.length ?? 0) === 0) {
    // members does not exist, remove self
    await prisma.group.delete({
      where: {
        id,
      },
    });
    return { count: 1 };
  }

  if (!option.recursive) {
    throw new Error(`The group (${name}) has members, can't remove it`);
  }

  const checkedGroupId = new Set<number>();
  const removeCursively = async (
    group: NonNullable<typeof unit>
  ): Promise<Prisma.BatchPayload> => {
    if (group.length === 0) return { count: 0 };

    const member = await prisma.groupInherit.findMany({
      where: {
        unitId: {
          in: group!.map(({ memberId }) => memberId),
        },
      },
      select: {
        memberId: true,
      },
    });

    /**
     * filter duplicate and add items to checkedGroupId, avoid loop back.
     */
    member.filter(({ memberId }) => {
      if (checkedGroupId.has(memberId)) return false;
      checkedGroupId.add(memberId);
      return true;
    });

    const { count } = await removeCursively(member);

    const groupId = group.map(({ memberId }) => memberId);
    await prisma.groupInherit.deleteMany({
      where: {
        memberId: {
          in: groupId,
        },
      },
    });
    const { count: deleted } = await prisma.group.deleteMany({
      where: {
        id: {
          in: groupId,
        },
      },
    });
    return { count: count + deleted };
  };

  const { count } = await removeCursively(unit!);
  await prisma.group.delete({
    where: {
      id,
    },
  });
  return { count: count + 1 };
}

export async function removeMany(
  name: FullName[],
  option = {
    recursive: false,
  }
): Promise<Prisma.BatchPayload> {
  // call remove on each name, and summarize the results
  return (await Promise.all(name.map((n) => remove(n, option)))).reduce<{
    count: number;
  }>(({ count: summarize }, { count }) => ({ count: count + summarize }), {
    count: 0,
  });
}

export function appendUser(
  userId: Prisma.Enumerable<number>,
  groupId: number
): PrismaPromise<Prisma.BatchPayload> {
  return prisma.groupAssignment.createMany({
    data: enumerableFlat(userId).map<{ userId: number; groupId: number }>(
      (userId) => ({ userId, groupId })
    ),
    skipDuplicates: true,
  });
}

export function removeUser(
  userId: Prisma.Enumerable<number>,
  groupId: number
): PrismaPromise<Prisma.BatchPayload> {
  return prisma.groupAssignment.createMany({
    data: enumerableFlat(userId).map<{ userId: number; groupId: number }>(
      (userId) => ({ userId, groupId })
    ),
    skipDuplicates: true,
  });
}

export async function moveUser(
  userId: Prisma.Enumerable<number>,
  fromGroupId: number,
  toGroupId: number
): Promise<Prisma.BatchPayload> {
  if (fromGroupId === toGroupId)
    throw new Error(
      `move user between group can't indicate the same group id: (${fromGroupId})`
    );
  const [removed, appended] = await prisma.$transaction([
    removeUser(userId, fromGroupId),
    appendUser(userId, toGroupId),
  ]);
  return {
    count: removed.count + appended.count,
  };
}

export async function listUser(
  groupId: number,
  userCriteria = {
    id: true,
    name: true,
    email: true,
    alias: true,
  } as Prisma.UserSelect
): Promise<Array<Partial<User>>> {
  return prisma.user.findMany({
    where: {
      group: {
        every: {
          groupId,
        },
      },
    },
    select: userCriteria,
  });
}
