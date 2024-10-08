import { Prisma } from '@prisma/client';

export const LENGTH_MAX_NAME = 32;
export const DEFAULT_ROW_COUNT = 20;
export const MAX_CONNECTIONS = 5;

export type PageOption<PrismaOrderByInput> = {
  start?: number;
  skip?: number;
  count?: number;
  orderBy?: OrderByQuery<PrismaOrderByInput>;
};

/**
 * FullName is the name with hierarchy, e.g. dev/Beijing/root
 */
export type FullName = string;

/**
 * A function return type T or a value with type T
 */
type ResultExecution<T> = T | (() => T);

/**
 * Execute to get the result of [ResultExecution\<T\>]{@link ResultExecution<T>}
 */
export function resultExecute<T>(value: ResultExecution<T>): T {
  if (typeof value === 'function') {
    return (value as () => T)();
  }
  return value;
}

/**
 * Get a query input for an optional value.
 * If value exists and passes the validator, return the query input object, or else return undefined.
 * So we can simply deconstruct it as the query parameter.
 * @example `queryInput('take', count)  // count is optional`
 */
export function queryInput<K extends string, T>(
  key: K,
  value?: T,
  validator?: ResultExecution<boolean>
): undefined | Record<K, T> {
  return value === undefined || !(resultExecute(validator) ?? true)
    ? undefined
    : ({ [key]: value } as Record<K, T>);
}

type PickMatchingProperties<T, V> = Pick<
  T,
  { [K in keyof T]: Required<T>[K] extends V ? K : never }[keyof T]
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

export function orderByInput<T extends OrderByInput>(
  query?: OrderByQuery<PickMatchingProperties<T, Prisma.SortOrder>>,
  defaultOrderBy?: keyof T
): undefined | Prisma.Enumerable<T> {
  if (query?.orderBy === undefined && defaultOrderBy === undefined) {
    return undefined;
  }
  const key = (query?.orderBy ?? defaultOrderBy) as keyof T;
  return (query?.orderBy && query?.desc) !== undefined
    ? ({
        [key]: (query?.desc ? 'desc' : 'asc') as Prisma.SortOrder,
      } as T)
    : undefined;
}

/**
 * Get the hierarchy array from its full name, eg. dev/beijing/root => [root, beijing/root, dev/beijing/root]
 * it will verify every name, if not pass, throw an error.
 */
export function hierarchyByName(fullname: FullName): string[] | never {
  const allNames = fullname.split(/\//g);
  const hierarchy = allNames.reduceRight((hierarchy, name) => {
    verifyName(name);
    const lastName = hierarchy.at(-1);
    hierarchy.push(name + (lastName ? '/' + lastName : ''));
    return hierarchy;
  }, [] as Array<string>);
  return hierarchy;
}

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

export const itemOfEnumerable = <T>(
  enumerable = [] as Prisma.Enumerable<T>,
  index = 0
): T | undefined =>
  Array.isArray(enumerable) ? (enumerable as T[]).at(index) : enumerable;

export const enumerableIsEmpty = <T>(
  enumerable = [] as Prisma.Enumerable<T>
): boolean =>
  Array.isArray(enumerable)
    ? enumerable.length === 0
    : enumerable === undefined;

export const enumerableFlat = <T>(
  enumerable = [] as Prisma.Enumerable<T>
): T[] => (Array.isArray(enumerable) ? enumerable : [enumerable]);

export function listQueryCriteria<T extends OrderByInput>(
  count: number,
  skip = 0,
  start = 1,
  orderBy?: Prisma.Enumerable<T>
) {
  return {
    take: count,
    ...queryInput('skip', skip, skip > 1),
    ...queryInput('cursor', { id: start }, start > 1),
    ...queryInput('orderBy', orderBy),
  };
}
