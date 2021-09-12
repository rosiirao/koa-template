import { seedGroup } from './seed.group';
if (process.argv.length === 0) process.exit(0);

const start = process.argv.indexOf('--');

const argv = process.argv.slice(start + 1);

if (argv.includes('group')) {
  console.log('seed random groups start ...');
  const seedGroupAction = async () => {
    await seedGroup(2, 5);
    await seedGroup(1, 6, 10);
  };
  seedGroupAction().then(() => console.log('seed groups completed'));
}
