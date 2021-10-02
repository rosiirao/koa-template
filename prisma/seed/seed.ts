import { seedGroup } from './seed.group';
import { seedAdmin, seedUser, seedUserGroup } from './seed.user';

import { findAll } from '../../src/query/user.query';
import { rangeList } from '../../src/utils';
import { seedRole } from './seed.role';
if (process.argv.length === 0) process.exit(0);

const start = process.argv.indexOf('--');

const argv = process.argv.slice(start + 1);

enum SEED_OPTION {
  GROUP = 'group',
  USER = 'user',
  GROUP_ASSIGN = 'group_assign',
  ROLE = 'role',
  PRIVILEGE = 'privilege',
}

if (argv.includes(SEED_OPTION.GROUP)) {
  console.log('seed random groups start ...');
  const seedGroupAction = async () => {
    await seedGroup(2, 5);
    await seedGroup(2, 6);
    await seedGroup(2, 6, 10);
  };
  seedGroupAction().then(() => console.log('seed groups completed'));
}

if (argv.includes(SEED_OPTION.USER)) {
  console.log('seed random users start ...');
  const seedUserAction = async () => {
    await seedAdmin();
    return seedUser(2000);
  };
  seedUserAction().then(
    (x) => (console.dir(x, ' '), console.log('seed users completed'))
  );
}

if (argv.includes(SEED_OPTION.GROUP_ASSIGN)) {
  console.log('assign user to group start ...');
  seedUserGroup().then(() => console.log('assign user to group completed'));
}

if (argv.includes(SEED_OPTION.ROLE)) {
  console.log('seed random role start ...');
  seedRole().then(
    (x) => (console.dir(x, ' '), console.log('seed roles completed'))
  );
}

if (argv.includes(SEED_OPTION.PRIVILEGE)) {
  // todo: every role at least grant read priv
  // todo: some user or group grand some priv
}

// TODO: seed application
// TODO: seed UserRole, GroupRole

// TODO: seed resource and acl

if (argv.includes('test')) {
  const listOne = async () => {
    return findAll(1, {
      orderBy: 'id',
      desc: true,
    });
  };
  listOne().then((x) => console.dir(x, ' '));

  let count = 0;
  const MAX_CONNECTIONS = 5;
  // test 10_000 query
  console.log('prisma findAll(20) with 10_000 async');
  // make the max connections successful and then make the 10_000 async query work
  Promise.all(
    rangeList(MAX_CONNECTIONS, () => {
      return findAll(20).then(() => count++);
    })
  ).then(() => {
    rangeList(10_000, () => {
      findAll(20).then(() => count++);
    });
  });

  process.on('exit', () => {
    console.log('have find count:', count);
  });
}
