import { randomArbitrary } from '../utils';
import {
  create,
  createMany,
  remove,
  removeMany,
  /* getGroup, */ findGroupMapByName,
  findRoot,
  getGroup,
  itemOfEnumerable,
} from './group.query';

describe('group query test', () => {
  it('find group hierarchy by full name', async () => {
    const name = 'beijing/notes';
    // const group = getGroup();
    const groupMap = await findGroupMapByName(name);
    expect(groupMap).toMatchObject({
      [name]: { id: expect.any(Number) },
    });

    const name2 = 'recycle/guangdong/test-test';
    const groupMap2 = await findGroupMapByName(name2);
    console.dir(groupMap2);
  });

  it('find group hierarchy with its member by full name', async () => {
    const root = 'notes';
    const { [root]: rootGroup } = await findGroupMapByName(root, {
      selfMember: true,
    });
    const { unit } = itemOfEnumerable(rootGroup) ?? {};
    expect(unit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberId: expect.any(Number),
        }),
      ])
    );
  });

  it('find all root works', async () => {
    const rootNumber = 2;
    const root = await findRoot(2);
    let times = 0;
    for (
      let fetchCount = root.length;
      fetchCount === rootNumber;
      fetchCount = root.length - fetchCount, times++
    ) {
      root.concat(await findRoot(rootNumber, root.at(-1)?.id));
    }
    const idSet = new Set(root.map(({ id }) => id));

    // once get whole
    const rootWholeOnce = await findRoot(root.length);

    expect(root.length).toBeGreaterThanOrEqual(rootNumber * times);
    expect(root.length).toBe(idSet.size);
    expect(rootWholeOnce).toEqual(root);

    if (root.length === 0) {
      console.warn('No root group found, the test is not sufficient');
      return;
    }

    // check the root has no any members
    const group = root[randomArbitrary(root.length - 1)]!;
    const groupMap = await findGroupMapByName(group.name!);
    expect(Object.entries(groupMap)).toHaveLength(1);
    expect(groupMap).toEqual({
      [group.name!]: expect.objectContaining({ id: group.id }),
    });
    const find = (await getGroup(group!.id!, {
      member: { select: { unitId: true } },
    })) as { member: Record<'unitId', number>[] } | null;
    expect(find?.member).toHaveLength(0);

    const findMember = (await getGroup(group!.id!, {
      unit: { select: { memberId: true } },
    })) as null | { unit: Record<'memberId', number>[] };
    expect(findMember?.unit.length).toBeGreaterThanOrEqual(1);
  });

  it('create and delete group by full name contains chinese character', async () => {
    const name = 'recycle/beijing/dev-test';
    const chineseName = '通告/臺北/dev-test';
    await create(name);
    const groupMap = await findGroupMapByName(name);
    await create(name); // duplicate create name must do nothing
    const createWithChinese = await create(chineseName);
    const groupMapDup = await findGroupMapByName(name);

    const chineseNameMap = await findGroupMapByName(chineseName);

    const groupMapWithUnit = await findGroupMapByName(chineseName, {
      selfUnit: true,
    });
    const unitId = itemOfEnumerable(groupMapWithUnit[chineseName])?.member?.at(
      0
    )?.unitId;

    const [createWithoutMatchUnit, createWithUnit] = [
      create(name, unitId),
      create(chineseName, unitId),
    ];

    await expect(createWithoutMatchUnit).rejects.toThrow('not found');
    await expect(createWithUnit).resolves.toMatchObject(createWithChinese);

    const { count } = await remove('dev-test', { recursive: true });
    // check name and chineseName has same root;
    await removeMany(
      [name, chineseName].reduce<string[]>(
        (root, n) =>
          root.includes(n) ? root : [...root, n.replace(/.+\//gi, '')],
        []
      ),
      { recursive: true }
    );

    expect(groupMap).toMatchObject({
      [name]: { id: expect.any(Number) },
    });
    expect(groupMap).toMatchObject(groupMapDup);
    expect(chineseNameMap).toMatchObject({
      [chineseName]: { id: expect.any(Number) },
    });
    expect(unitId).toEqual(expect.any(Number));
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it('create multiple and delete groups by full name', async () => {
    const name = [
      'recycle/beijing/dev-test',
      'recycle/canton/dev-test',
      'recycle/guangdong/test-test',
    ];

    await createMany(name);
    const findName = name.at(-1)!;
    const groupMap = await findGroupMapByName(findName);
    await createMany(name);

    const groupMapDup = await findGroupMapByName(findName);
    const { count } = await removeMany(
      name.reduce<string[]>(
        (root, n) =>
          root.includes(n) ? root : [...root, n.replace(/.+\//gi, '')],
        []
      ),
      { recursive: true }
    );

    expect(groupMap).toMatchObject(groupMapDup);
    expect(groupMap).toMatchObject({
      [findName]: { id: expect.any(Number) },
    });
    expect(count).toBeGreaterThanOrEqual(7);
  });

  it("Can't delete group have members if not indicate recursive", async () => {
    const name = 'notes';
    return expect(remove(name)).rejects.toThrow('members');
  });

  it('create multiple group by full name array', async () => {
    expect(true).toBeTruthy();
    expect(1).toEqual(expect.any(Number));
  });
});
