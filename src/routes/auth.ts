import Router from '@koa/router';
import { login, auth } from '../controllers/auth';
import body from 'koa-body';

import { IUserState } from '../app';
import compose from 'koa-compose';

const router = new Router<unknown, IUserState>({
  prefix: '/auth',
});

router.post('/login', body(), login).get('/who', auth, async function (ctx) {
  ctx.body = ctx.currentUser;
});

export default compose([router.routes(), router.allowedMethods()]);
