import {
  createResource,
  findAllResources,
  // findResource,
  // findAllResourcesByUser,
  updateResources,
} from './resource.query';
import { findAll } from './user.query';
import prisma from './client';
import { nextId } from '../utils';

describe.skip('resource query operation ', () => {
  afterAll(() => {
    // restore all user-resource data
    return prisma.$disconnect();
  });
  it('Resource permission modify', async () => {
    /**
     * Set all users as readers and authors, then restore default state
     */

    const users = await findAll(10, { orderBy: 'id', desc: true });

    if (users.length === 0) return;
    let [res] = await findAllResources(1, undefined, 1, {
      orderBy: 'id',
      desc: true,
    });

    if (res === undefined) {
      res = await createResource(nextId(), 0, { authors: [], readers: [] });
    }

    const { id, userResource } = res;

    const { authors, readers } = userResource.reduce<{
      authors: number[];
      readers: number[];
    }>(
      (data, { userId, author, reader }) => {
        if (author) {
          data.authors.push(userId);
        }
        if (reader) {
          data.readers.push(userId);
        }
        return data;
      },
      {
        readers: [],
        authors: [],
      }
    );

    const newResource = await updateResources(id, {
      authors: users.map(({ id }) => id),
      readers: users.map(({ id }) => id),
    });
    expect(newResource?.userResource).toEqual(
      expect.arrayContaining(
        users.map(({ id }) => ({
          userId: id,
          author: true,
          reader: true,
        }))
      )
    );

    /**
     * restore the original state
     */
    await updateResources(id, {
      authors,
      readers,
    });
  });
});
