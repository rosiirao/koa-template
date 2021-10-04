import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import { debounceAsyncExecutor, rangeList } from '../../src/utils';
import {
  create as createUser,
  createMany as createManyUser,
  findAll,
  findUnique,
} from '../../src/query/user.query';

import { appendUser, findRoot, findMember } from '../../src/query/group.query';

import { Prisma, User } from '.prisma/client';
import { randomName, getRandomArbitrary } from './seed.shared';

const saltRounds = 8;
// const myPlaintextPassword = 's0//P4$$w0rD';
// const someOtherPlaintextPassword = 'not_bacon';

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
};

export const seedAdmin = async (): Promise<User | undefined> => {
  const email = 'admin@example.com';
  const admin = await findUnique({ email });
  if (admin !== null) {
    console.log('The account admin exists, skip seedAdmin');
    return undefined;
  }
  const password = nanoid(8);
  // print the default admin password to user.
  console.log(`Use admin:${password} to login`);
  const user: Parameters<typeof createUser>[0] = {
    email,
    password: await hashPassword(password),
  };
  return createUser(user);
};

export const seedUser = async (
  count = 10_000
): Promise<Prisma.BatchPayload> => {
  const user = await userList(count);
  const many = await createManyUser(
    user.map(({ email, password, ...rest }) => ({
      email,
      password,
      others: rest,
    }))
  );
  return many;
};

export async function userList(
  count: number
): Promise<
  { name: string; alias?: string; email: string; password: string }[]
> {
  if (count <= 0)
    throw new Error(
      `The number of randomly generate user name must great than 0, got (${count})`
    );

  /**
   * the records in db
   */
  const backend = (await findAll()).reduce<
    [email: Set<string>, name: Set<string>]
  >(
    ([m, n], { email, name }) => (m.add(email), n.add(name), [m, n]),
    [new Set(), new Set()]
  );

  const defaultPassword = '1234';
  const nextName = (function* () {
    while (true) {
      yield randomName();
    }
  })();
  const nextEmail = (function* (name: string) {
    while (true) {
      name = yield `${name}@${randomMailDomain()}`;
    }
  })('');
  nextEmail.next(); // skip the empty name for initialize email generator
  const nameSet = new Set();
  const user = [] as {
    name: string;
    alias?: string;
    email: string;
    password: string;
  }[];
  while (nameSet.size < count) {
    let name = nextName.next().value;
    let alias: string | undefined = undefined;
    while (nameSet.has(name) || backend[1].has(name)) {
      alias = name;
      name = nextName.next().value;
    }
    nameSet.add(name);
    let email = nextEmail.next(name).value;
    while (backend[0].has(email)) {
      // if email conflict, simply prepend _ to the it
      email = '_' + email;
    }
    user.push({
      name,
      ...(alias ? { alias } : undefined),
      email,
      password: await hashPassword(defaultPassword),
    });
  }
  return user;
}

export async function seedUserGroup(): Promise<void> {
  // find the last user, get the greatest number.
  const { id: maxUserId } =
    (
      await findAll(1, undefined, {
        orderBy: 'id',
        desc: true,
      })
    )[0] ?? {};
  if (maxUserId === undefined) {
    throw new Error('No user exists, make sure seed users first');
  }
  const user = (await findAll(maxUserId)).map(({ id }) => id);

  // test and get all root;
  const rootNumber = 1_000;
  const org = await findRoot(rootNumber);
  for (
    let fetchCount = org.length;
    fetchCount === rootNumber;
    fetchCount = org.length - fetchCount
  ) {
    org.concat(await findRoot(rootNumber, { start: org.at(-1)?.id ?? 1 }));
  }
  if (org.length === 0) {
    throw new Error('No group exists, make sure seed groups first');
  }

  /** User assigned with times initialize */
  const assignedUser = user.reduce<Map<number, number>>(
    (acc, id) => (acc.set(id, 0), acc),
    new Map()
  );

  /** Group assigned */
  const assignedGroup = new Set<number>();

  /**
   * Generate random number of users
   */
  const randomNumberOfUser = (max: number, min: number): Iterable<number> => {
    const count = getRandomArbitrary(max + 1, min);
    const members = new Set<number>();
    rangeList(count, () => {
      let id = getRandomArbitrary(maxUserId + 1);
      let times = assignedUser.get(id);
      while (times === undefined || members.has(id)) {
        id = getRandomArbitrary(maxUserId + 1);
        times = assignedUser.get(id);
      }
      assignedUser.set(id, times + 1);
      members.add(id);
    });
    return members;
  };

  /**
   * Debounced executor with a 50 quota to execute appendUser,
   */
  const assignExecutor = debounceAsyncExecutor(50);

  // all append operation push in *assignOperation*
  const appendToGroup = (...arg: Parameters<typeof appendUser>) =>
    assignExecutor.add(() => appendUser(...arg));

  const assignToGroup = (max: number, min: number, groupId: number) => {
    appendToGroup([...randomNumberOfUser(max, min)], groupId);
  };

  const [org_max, org_min, group_max, group_min] = [16, 8, 20, 10];
  const assign = async (group: Array<number>) => {
    group.forEach(async (id) => {
      if (assignedGroup.has(id)) return;
      assignedGroup.add(id);

      assignToGroup(group_max, group_min, id);
      const member = (await findMember(id)).map(({ memberId }) => memberId);
      assign(member);
    });
  };

  org.forEach(async ({ id }) => {
    if (assignedGroup.has(id)) return;
    assignedGroup.add(id);

    assignToGroup(org_max, org_min, id);
    const member = (await findMember(id)).map(({ memberId }) => memberId);
    assign(member);
  });

  // make sure every user assigned
  const assignedByTimes = [...assignedUser.entries()].reduce<
    Map<number, Array<number>>
  >(
    (acc, [id, times]) => acc.set(times, (acc.get(times) ?? []).concat(id)),
    new Map()
  );

  const randomGroupGen: Generator<number, never, unknown> = ((
    group: Set<number>,
    size = group.size
  ) => {
    const list = [...group];
    return (function* () {
      while (true) {
        yield list.at(getRandomArbitrary(size))!;
      }
    })();
  })(assignedGroup);

  assignedByTimes.get(0)?.forEach((id) => {
    appendToGroup(id, randomGroupGen.next().value);
  });

  await assignExecutor.finish();
}

function randomMailDomain(): string {
  const domainOptions = [
    'example.com',
    'abc.com',
    'biz.org',
    'blublu.com',
    'xyz.com',
    'niu.org',
  ];
  return domainOptions[getRandomArbitrary(domainOptions.length)];
}
