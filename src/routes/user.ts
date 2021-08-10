import Router from '@koa/router';
import createHttpError from 'http-errors';
import compose from 'koa-compose';
import { findAll, findOne } from '../query/user';

const router = new Router({
  prefix: '/user',
});

router.get('/:id?', async (ctx) => {
  const { id } = ctx.params;
  if (id === '' || id === undefined) {
    const allUsers = await findAll();
    ctx.type = '.json';
    ctx.body = JSON.stringify(allUsers, null, '  ');
    return;
  }
  if (!/^\d+$/.test(id)) {
    throw createHttpError(404, 'User not found');
  }
  const user = await findOne(Number(id));
  if (user == undefined) {
    throw createHttpError(404, 'User not found');
  }
  ctx.type = '.json';
  ctx.body = JSON.stringify(user, null, '  ');
  return user;
});

export default compose([router.routes(), router.allowedMethods()]);
