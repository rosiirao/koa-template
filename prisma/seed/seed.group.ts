import { Prisma } from '@prisma/client';
import { createMany } from '../../src/query/group.query';

import { getRandomArbitrary, randomName } from './seed.shared';

export const groupListReady = (
  rootCount = 5,
  depth = 8,
  maxChildren = 20
): string[] => {
  let layer = new Set<string>();
  layer.add('root');
  for (let i = 0; i < getRandomArbitrary(rootCount, rootCount / 2); i++) {
    layer.add(randomName());
  }
  let lastLayer = layer;
  layer = new Set<string>();
  for (
    let i = 0;
    i < depth;
    i++, [lastLayer, layer] = [layer, lastLayer], layer.clear()
  ) {
    lastLayer.forEach((parent) => {
      for (let j = 0; j < getRandomArbitrary(maxChildren, 1); j++) {
        try {
          layer.add(`${randomName()}/${parent}`);
        } catch (e) {
          console.log(i, ' - ', j, ' - ', parent, ' - ', layer.size);
          throw e;
        }
      }
    });
  }
  return [...lastLayer];
};

export const seedGroup = async (
  rootCount = 5,
  depth = 8,
  maxChildren = 20
): Promise<void> => {
  await createMany(groupListReady(rootCount, depth, maxChildren));
};

export const seedTestGroup = async (): Promise<Prisma.BatchPayload> => {
  return createMany([
    'dev/beijing/root',
    'support/beijing/root',
    'manager/beijing/root',
    'dev/canton/root',
    'support/canton/root',
    'manager/canton/root',
    'dev/beijing/notes',
    'support/beijing/notes',
    'provision/beijing/notes',
    'consult/canton/notes',
    'support/canton/notes',
    'manager/canton/notes',
  ]);
};
