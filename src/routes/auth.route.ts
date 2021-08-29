import Router from '@koa/router';
import {
  changePassword,
  changePasswordAuth,
  login,
  refreshToken,
  register,
  verifyAuthToken,
} from '../controllers/auth.controller';
import { cors } from '../controllers/cors';
import body from 'koa-body';

import { IUserState } from '../app';
import compose from 'koa-compose';

const router = new Router<IUserState>({
  prefix: '/auth',
});

router
  .post('/login', body(), login)
  .post('/register', body(), register)
  .post('/change_password_auth', verifyAuthToken, changePasswordAuth)
  .post('/change_password', verifyAuthToken, changePassword)
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

export default compose([cors, router.routes(), router.allowedMethods()]);
