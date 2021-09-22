import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import { nextId } from '../../src/utils';
import {
  createApplication,
  createResource,
} from '../../src/query/resource.query';
import {
  create as createUser,
  createMany as createManyUser,
  findAll,
  findUnique,
} from '../../src/query/user.query';
import { createMany as createRole } from '../../src/query/role.query';
import { Application, Prisma, User } from '.prisma/client';
import { randomName, getRandomArbitrary } from './seed.shared';

const saltRounds = 8;
// const myPlaintextPassword = 's0//P4$$w0rD';
// const someOtherPlaintextPassword = 'not_bacon';

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
};

export const seedApplication = async (): Promise<Application[]> => {
  return Promise.all([
    createApplication('home'),
    createApplication('demo'),
    createApplication('help'),
  ]);
};

export const seedRole = async (): Promise<Prisma.BatchPayload> => {
  const role = roleHierarchyList([1, 2, 3], 50);
  const updateInput = role.map(({ fullname: _, ...rest }) => rest);
  const roleCreated = createRole(updateInput);

  return roleCreated;
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

export const seedResource = async (applicationId: number): Promise<unknown> => {
  return createResource(nextId(), applicationId, { readers: [], authors: [] });
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

function randomMailDomain(): string {
  const domainOptions = [
    'example.com',
    'abc.com',
    'biz.org',
    'blublu.com',
    'xyz.com',
  ];
  return domainOptions[getRandomArbitrary(domainOptions.length)];
}

export function roleHierarchyList(
  applications: Array<number>,
  roleCount = 50
): Array<{
  applicationId: number;
  name: string;
  fullname: string;
}> {
  return applications
    .map((id) => {
      const roleFullName = new Set<string>();
      for (let i = 0; i < roleCount; i++) {
        const newRole = randomName('/').replace(/^\/+|(?<=\/)\/+|\/+$/gi, '');
        roleFullName.add(newRole);
      }
      return [...roleFullName].map((fullname) => {
        return {
          fullname,
          name: fullname.replace(/\/.+$/gi, ''),
          applicationId: id,
        };
      });
    })
    .flat();
}
