import { listUsers } from './user.query.js';

const adminIdentities = { id: 1, role: [], group: [] } as const;
describe('user.query test', () => {
  it('find all users can get all users', async () => {
    /**
     * the records in db
     */
    const [emails, names] = (
      await listUsers({
        applicationId: 1,
        identities: adminIdentities,
      })
    ).reduce<[email: Set<string>, name: Set<string>]>(
      ([m, n], { email, name }) => (m.add(email), n.add(name), [m, n]),
      [new Set(), new Set()]
    );

    expect(emails.size).toBeGreaterThan(0);
    expect(emails.size).toBe(names.size);
  });
});
