import Router from '@koa/router';
import { login, verifyAuthToken } from '../controllers/auth';
import { cors } from '../controllers/cors';
import body from 'koa-body';

import { IUserState } from '../app';
import compose from 'koa-compose';

const router = new Router<unknown, IUserState>({
  prefix: '/auth',
});

router
  .post('/login', body(), login)
  .options('/who', (ctx) => {
    ctx.set({
      'Access-Control-Allow-Headers': 'Authorization',
    });
    ctx.status = 204;
  })
  .get('/who', verifyAuthToken, async function (ctx) {
    ctx.body = ctx.state.name;
  });

export default compose([cors, router.routes(), router.allowedMethods()]);
