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
import type Koa from 'koa';

const router = new Router({
  prefix: '/auth',
});

router
  .post('/login', body.koaBody(), login)
  .post('/register', body.koaBody(), register)
  .post('/change_password_auth', body.koaBody(), changePasswordAuth)
  .post('/change_password', verifyAuthToken, body.koaBody(), changePassword)
  .post('/reset_password', body.koaBody(), changePassword)
  .get('/refresh_token', refreshToken)
  .options('/who', (ctx: Koa.DefaultContext) => {
    ctx.set({
      'Access-Control-Allow-Headers': 'Authorization',
    });
    ctx.status = 204;
  })
  .get('/who', verifyAuthToken, async function (ctx: Koa.DefaultContext) {
    ctx.body = ctx.state.user.name;
  });

authorizeParamRoute(router, {
  applicationName: 'applicationName',
  resourceId: 'resourceId',
})
  .get('/:applicationName', (ctx: Koa.DefaultContext) => {
    const applicationId = ctx.state.subject?.applicationId;
    if (applicationId === undefined)
      throw createHttpError(
        500,
        'The application state is not load before used, use authorizeRoute or authorizeParamRoute first'
      );
    ctx.body = ctx.state.privilege;
  })
  .get('/:applicationName/:resourceId?', (ctx: Koa.DefaultContext) => {
    const { applicationId, resourceId } = ctx.state.subject ?? {};
    if (applicationId === undefined || resourceId === undefined)
      throw createHttpError(
        500,
        'The resource state is not load before used, use authorizeRoute or authorizeParamRoute first'
      );
    ctx.body = ctx.state.privilege?.resource;
  });

export default compose([cors, router.routes(), router.allowedMethods()]);
