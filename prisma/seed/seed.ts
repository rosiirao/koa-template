import { seedGroup } from './seed.group';
import { seedAdmin, seedUser, seedUserGroup } from './seed.user';

import { listUsers } from '../../src/query/user.query';
import { rangeList } from '../../src/utils';
import { seedRole } from './seed.role';
import { seedPrivilege } from './seed.privilege';
import { seedRoleAssign } from './seed.role.assign';
import { registerNamesResource } from './seed.names.resource';

if (process.argv.length === 0) process.exit(0);

const start = process.argv.indexOf('--');

const argv = process.argv.slice(start + 1);

enum SEED_OPTION {
  GROUP = 'group',
  USER = 'user',
  GROUP_ASSIGN = 'group_assign',
  ROLE = 'role',
  PRIVILEGE = 'privilege',
  ROLE_ASSIGN = 'role_assign',
  NAMES_RESOURCE = 'names_resource',
}

const aclCriteria = {
  applicationId: 1,
  identities: { id: 1, role: [], group: [] },
};

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
  console.log('assign group to users start ...');
  seedUserGroup().then(() => console.log('assign group to users completed'));
}

if (argv.includes(SEED_OPTION.ROLE)) {
  console.log('seed random role start ...');
  seedRole().then(
    (x) => (console.dir(x, ' '), console.log('seed roles completed'))
  );
}

if (argv.includes(SEED_OPTION.PRIVILEGE)) {
  console.log('seed privilege start ...');
  seedPrivilege().then(
    (x) => (console.dir(x, ' '), console.log('seed privilege completed'))
  );
}

if (argv.includes(SEED_OPTION.ROLE_ASSIGN)) {
  console.log('assign role to users and groups start ...');
  seedRoleAssign().then(
    (x) => (
      console.dir(x, ' '),
      console.log('assign role to users and groups completed')
    )
  );
}

if (argv.includes(SEED_OPTION.NAMES_RESOURCE)) {
  registerNamesResource();
}

// TODO: seed resource and acl

if (argv.includes('test')) {
  const listOne = async () => {
    return listUsers(aclCriteria, 1, undefined, {
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
      return listUsers(aclCriteria, 20).then(() => count++);
    })
  ).then(() => {
    rangeList(10_000, () => {
      listUsers(aclCriteria, 20).then(() => count++);
    });
  });

  process.on('exit', () => {
    console.log('have find count:', count);
  });
}
