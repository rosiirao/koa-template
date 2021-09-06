import { Prisma } from '@prisma/client';

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

type OrderByInput = { [key: string]: Prisma.SortOrder };
export type OrderByQuery<T extends OrderByInput> = {
  orderBy: keyof T;
  desc?: boolean;
};

export const orderByInput = <T extends OrderByInput>(
  query?: OrderByQuery<T>,
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
