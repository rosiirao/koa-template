import { ThenArg } from '../../src/utils';
import { userList } from './seed.user';

describe('create user list', () => {
  it('list name, alias, email unique', async () => {
    const userCount = 2_00;
    let nameDuplicated = false;
    let emailStartsWithName = true;

    const duplicatedAliasTryTimesMax = 5;

    const aliasDuplicateCountBase = userCount * duplicatedAliasTryTimesMax;
    const aliasDuplicateCountMax = Math.max(aliasDuplicateCountBase / 100, 1);
    const aliasDuplicateCountMin = Math.min(aliasDuplicateCountBase / 100, 1);
    let aliasDuplicateCount = 0;

    const user: ThenArg<typeof userList> = [];
    for (
      let duplicatedAliasTry = 0;
      duplicatedAliasTry < duplicatedAliasTryTimesMax &&
      aliasDuplicateCount === 0;
      duplicatedAliasTry++
    ) {
      user.concat(await userList(userCount));
      user.every(({ name, alias, email }, index) => {
        const rest = user.slice(index + 1);
        const nameDup = rest.find(
          ({ name: nameInRest }) => nameInRest === name
        );
        if (nameDup !== undefined) {
          nameDuplicated = true;
          return false; // test fail;
        }
        if (!email.startsWith(`${name}@`)) {
          emailStartsWithName = false; // test fail
          return false; // test fail;
        }
        if (alias !== undefined) aliasDuplicateCount++;
        return true;
      });
    }

    expect(emailStartsWithName).toBeTruthy();
    expect(nameDuplicated).toBeFalsy();
    expect(aliasDuplicateCount).toBeLessThanOrEqual(aliasDuplicateCountMin);
    expect(aliasDuplicateCount).toBeLessThan(aliasDuplicateCountMax);
  }, 30_000 /* hash password need cpu time */);
});
