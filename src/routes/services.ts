import Router from '@koa/router';
import { login, auth } from '../controllers/auth';
import body from 'koa-body';

import { ICustomAppState } from '../app';

const router = new Router<unknown, ICustomAppState>({
  prefix: '/services',
});

router.post('/login', body(), login).get('/who', auth, async function (ctx) {
  ctx.body = ctx.currentUser;
});
export default router;
