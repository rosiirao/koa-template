import { Prisma } from '@prisma/client';

export const LENGTH_MAX_NAME = 32;
export const DEFAULT_ROW_COUNT = 20;

/**
 * Get a query input for an optional value.
 * If value exists, return the query input object, or else return undefined.
 * So we can simply deconstruct it as the query parameter.
 * @example `...queryInput('take', count)  // count is optional`
 */
export const queryInput = <T>(
  key: string,
  value?: T
): undefined | { [key: string]: T } =>
  value === undefined ? undefined : { [key]: value };

type PickMatchingProperties<T, V> = Pick<
  T,
  { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T]
>;

type OrderByInput = {
  [key: string]:
    | Prisma.SortOrder
    | PickMatchingProperties<OrderByInput, Prisma.SortOrder>;
};

export type OrderByQuery<T> = {
  orderBy: keyof PickMatchingProperties<T, Prisma.SortOrder>;
  desc?: boolean;
};

export const orderByInput = <T extends OrderByInput>(
  query?: OrderByQuery<PickMatchingProperties<T, Prisma.SortOrder>>,
  defaultOrderBy?: keyof T
): undefined | Prisma.Enumerable<T> => {
  if (query?.orderBy === undefined && defaultOrderBy === undefined) {
    return undefined;
  }
  const key = (query?.orderBy ?? defaultOrderBy) as keyof T;
  return (query?.orderBy && query?.desc) !== undefined
    ? ({
        [key]: (query?.desc ? 'desc' : 'asc') as Prisma.SortOrder,
      } as T)
    : undefined;
};

/**
 * Get the hierarchy array from its full name, eg. dev/beijing/root => [root, beijing/root, dev/beijing/root]
 * it will verify every name, if not pass, throw an error.
 */
export const hierarchyByName = (fullname: string): string[] | never => {
  const allNames = fullname.split(/\//g);
  const hierarchy = allNames.reduceRight((hierarchy, name) => {
    verifyName(name);
    const lastName = hierarchy.at(-1);
    hierarchy.push(name + (lastName ? '/' + lastName : ''));
    return hierarchy;
  }, [] as Array<string>);
  return hierarchy;
};

/**
 * Verify name length, if it can't pass, then throw error.
 */
export function verifyName(name: string): true | never {
  if (name.trim() === '') {
    throw new Error("The role name can't be empty");
  }

  if (name.length > LENGTH_MAX_NAME) {
    throw new Error(
      `The length of the name can\t exceed ${LENGTH_MAX_NAME}, got name ${name}`
    );
  }
  return true;
}
