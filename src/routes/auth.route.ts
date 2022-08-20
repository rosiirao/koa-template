import Router from '@koa/router';
import {
  changePassword,
  changePasswordAuth,
  login,
  refreshToken,
  register,
  verifyAuthToken,
} from '../controllers/auth.controller.js';
import { cors } from '../controllers/cors.js';

import { authorizeParamRoute } from './application.authorize.js';

import body from 'koa-body';
import compose from 'koa-compose';
import createHttpError from 'http-errors';

const router = new Router({
  prefix: '/auth',
});

router
  .post('/login', body(), login)
  .post('/register', body(), register)
  .post('/change_password_auth', body(), changePasswordAuth)
  .post('/change_password', verifyAuthToken, body(), changePassword)
  .post('/reset_password', body(), changePassword)
  .get('/refresh_token', refreshToken)
  .options('/who', (ctx) => {
    ctx.set({
      'Access-Control-Allow-Headers': 'Authorization',
    });
    ctx.status = 204;
  })
  .get('/who', verifyAuthToken, async function (ctx) {
    ctx.body = ctx.state.user.name;
  });

authorizeParamRoute(router, {
  applicationName: 'applicationName',
  resourceId: 'resourceId',
})
  .get('/:applicationName', (ctx) => {
    const applicationId = ctx.state.subject?.applicationId;
    if (applicationId === undefined)
      throw createHttpError(
        500,
        'The application state is not load before used, use authorizeRoute or authorizeParamRoute first'
      );
    ctx.body = ctx.state.privilege;
  })
  .get('/:applicationName/:resourceId?', (ctx) => {
    const { applicationId, resourceId } = ctx.state.subject ?? {};
    if (applicationId === undefined || resourceId === undefined)
      throw createHttpError(
        500,
        'The resource state is not load before used, use authorizeRoute or authorizeParamRoute first'
      );
    ctx.body = ctx.state.privilege?.resource;
  });

export default compose([cors, router.routes(), router.allowedMethods()]);
