import prisma from '../../../query/client';
import { Group, Prisma, Role, User } from '@prisma/client';

import {
  DEFAULT_ROW_COUNT,
  listQueryCriteria,
  orderByInput,
  OrderByQuery,
  queryInput,
} from '../../../query/query.shared';

const typeSelector = (query?: 'user' | 'group' | 'role') => ({
  select: {
    user: true,
    group: true,
    role: true,
  },
  ...queryInput('select', query && { [query]: true }),
});

export async function queryNames(
  option = {} as {
    count?: number;
    start?: number;
    skip?: number;
    orderBy?: OrderByQuery<Prisma.UserOrderByWithAggregationInput>;
  },
  query?: 'user' | 'group' | 'role'
) {
  const { count = DEFAULT_ROW_COUNT, skip = 0, start = 1 } = option;
  const orderBy = orderByInput<Prisma.UserOrderByWithAggregationInput>(
    option.orderBy,
    'id'
  );

  const filterType =
    query === undefined
      ? undefined
      : {
          NOT: {
            [query]: null,
          },
        };
  const resource = await prisma.namesResource.findMany({
    where: {
      ...filterType,
    },
    ...listQueryCriteria(count, skip, start, orderBy),
    ...typeSelector(query),
  });
  return query !== undefined ? resource.map((v) => v[query]) : resource;
}

export function queryName(id: number, query?: 'user' | 'group' | 'role') {
  const resource = prisma.namesResource.findFirst({
    where: {
      id,
    },
    ...typeSelector(query),
  });
  return query !== undefined
    ? (resource[query] as () => Promise<User | Group | Role | null>)()
    : resource;
}
