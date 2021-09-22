import { seedGroup } from './seed.group';
import { seedAdmin, seedUser } from './seed.user';

import { findAll } from '../../src/query/user.query';
if (process.argv.length === 0) process.exit(0);

const start = process.argv.indexOf('--');

const argv = process.argv.slice(start + 1);

if (argv.includes('group')) {
  console.log('seed random groups start ...');
  const seedGroupAction = async () => {
    await seedGroup(2, 5);
    await seedGroup(2, 6);
    await seedGroup(2, 6, 10);
  };
  seedGroupAction().then(() => console.log('seed groups completed'));
}

if (argv.includes('user')) {
  console.log('seed random users start ...');
  const seedUserAction = async () => {
    await seedAdmin();
    return seedUser();
  };
  seedUserAction().then(
    (x) => (console.dir(x, ' '), console.log('seed users completed'))
  );
}

// TODO: test if number of connections is decided by mariadb configuration

// TODO: seed UserGroup relation
// TODO: seed application
// TODO: seed Role and Role inherit
// TODO: seed privileges
// TODO: seed UserRole, GroupRole

// TODO: seed resource and acl

// TODO: test find all resources by user.
// TODO: load testing

// TODO: Database healthy check periodically

if (argv.includes('test')) {
  console.log('');
  const listOne = async () => {
    return findAll(1, {
      orderBy: 'id',
      desc: true,
    });
  };
  listOne().then((x) => console.dir(x, ' '));
}
