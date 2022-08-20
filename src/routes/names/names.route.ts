import Router from '@koa/router';
import createHttpError from 'http-errors';
import compose from 'koa-compose';
import { findACL } from '../../query/acl.query/names.acl.query.js';
import { AuthorizedState } from '../../app.js';
import { authorizeRoute } from '../application.authorize.js';
import { itemOfEnumerable, queryInput } from '../../query/query.shared.js';
import { findNames } from '../../controllers/application.controller/names/index.js';

const router = authorizeRoute(
  new Router<AuthorizedState>(),
  {
    params: {
      applicationName: 'applicationName',
      resourceId: 'resourceId',
    },
    parameterizedPath: '/:applicationName/:resourceId?',
  },
  findACL
);

router
  .get('/names/:id?', async (ctx) => {
    const type = itemOfEnumerable(ctx.query.t ?? ctx.query.type);
    const { start, skip, count } = ctx.query;

    const names = await findNames(
      ctx.state.subject,
      {
        ...queryInput('skip', queryToNumber(skip ?? start)),
        ...queryInput('count', queryToNumber(count)),
      },
      type
    );
    if (names == undefined) {
      throw createHttpError(404, 'User not found');
    }
    ctx.type = '.json';
    if (Array.isArray(names)) {
      ctx.body = JSON.stringify(names, null, '  ');
      return;
    }
    ctx.type = '.json';
    ctx.body = names;
    return names;
  })
  .put('/names/:id');

/**
 * Return the number value of the ctx.query
 * @param queryItem
 * @returns
 */
function queryToNumber(queryItem?: string | string[]) {
  const value = itemOfEnumerable(queryItem);
  return value === undefined
    ? undefined
    : isFinite(Number(value))
    ? parseInt(value)
    : undefined;
}

export default compose([router.routes(), router.allowedMethods()]);
