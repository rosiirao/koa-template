import Router from '@koa/router';
import createHttpError from 'http-errors';
import compose from 'koa-compose';
import { findACL } from '../../query/acl.query/names.acl.query';
import { AuthorizedState } from '../../app';
import { findUser } from '../../controllers/application.controller/names/user.controller';
import { authorizeRoute } from '../application.route';

const router = new Router<AuthorizedState>();

authorizeRoute(
  router,
  {
    params: {
      applicationName: 'applicationName',
      resourceId: 'resourceId',
    },
    parameterizedPath: '/:applicationName/:resourceId',
  },
  findACL
);

router
  .get('/names/:id?', async (ctx) => {
    const user = await findUser(ctx.state.subject, ctx.state.identities);

    if (user == undefined) {
      throw createHttpError(404, 'User not found');
    }
    ctx.type = '.json';
    if (Array.isArray(user)) {
      ctx.body = JSON.stringify(user, null, '  ');
      return;
    }
    ctx.type = '.json';
    ctx.body = user;
    return user;
  })
  .put('/names/:id');

export default compose([router.routes(), router.allowedMethods()]);
