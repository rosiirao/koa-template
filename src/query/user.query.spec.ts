import { findAll } from './user.query';

describe('user.query test', () => {
  it('find all users can get all users', async () => {
    /**
     * the records in db
     */
    const backend = (await findAll()).reduce<
      [email: Set<string>, name: Set<string>]
    >(
      ([m, n], { email, name }) => (m.add(email), n.add(name), [m, n]),
      [new Set(), new Set()]
    );

    expect(backend[0].size).toBe(backend[1].size);
  });
});
