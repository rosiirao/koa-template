import {
  createResource,
  removeResource,
  findAllResources,
  updateResources,
} from './resource.query.js';
import { listUsers } from './user.query.js';
import prisma from './client.js';
// import { nextId } from '../utils';

const adminIdentities = { id: 1, role: [], group: [] } as const;

describe('resource query operation ', () => {
  afterAll(() => {
    // restore all user-resource data
    return prisma.$disconnect();
  });
  it('Resource permission modify', async () => {
    /**
     * Set all users as readers and authors, then restore default state
     */

    const users = await listUsers(
      {
        applicationId: 1,
        identities: adminIdentities,
      },
      10,
      undefined,
      { orderBy: 'id', desc: true }
    );

    expect(users.length).toBeGreaterThan(0);
    if (users.length === 0) return;
    const [res] = await findAllResources(1, undefined, 1, {
      orderBy: 'id',
      desc: true,
    });

    expect(res).not.toBe(undefined);
    if (res === undefined) return;

    const { id, UserACL } = res;

    const [authors, readers] = UserACL.reduce<
      [authors: number[], readers: number[]]
    >(
      ([authors, readers], { userId, author, reader }) => {
        if (author) {
          authors.push(userId);
        }
        if (reader) {
          readers.push(userId);
        }
        return [authors, readers];
      },
      [[], []]
    );

    const newResource = await updateResources(id, {
      authors: users.map(({ id }) => id),
      readers: users.map(({ id }) => id),
    });
    expect(newResource?.UserACL).toEqual(
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

  it('Create and delete resource', async () => {
    const [res] = await findAllResources(1, undefined, 1, {
      orderBy: 'id',
      desc: true,
    });
    const id = res?.id ?? 1;
    const created = await createResource(id, 1, { authors: [], readers: [] });
    expect(created).not.toBe(undefined);
    if (created === undefined) return;
    expect(created.id).toBe(id);
    const removed = await removeResource(id);
    expect(removed).toBe(true);
    if (!removed) {
      console.warn(`Testing created resource ${id} is not be removed`);
    }
  });
});
