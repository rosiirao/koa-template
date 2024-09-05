import type Koa from 'koa';
import Router from '@koa/router';
import createHttpError from 'http-errors';
import compose from 'koa-compose';
import { getGroupFullName, getGroupMember } from '../query/group.query.js';
import cache from '../controllers/cache.controller.js';

const router = new Router({
  prefix: '/test',
});

router.get('/cache', cache);

router
  .get('/group/:id', async (ctx: Koa.DefaultContext) => {
    const { id } = ctx.params;

    const group = await getGroupFullName(Number(id));
    if (group == undefined) {
      throw createHttpError(404, 'group not found');
    }
    ctx.type = '.json';
    ctx.body = JSON.stringify(group, null, '  ');
    return group;
  })
  .get('/gMember/:id', async (ctx: Koa.DefaultContext) => {
    const { id } = ctx.params;

    const group = await getGroupMember(Number(id));
    if (group == undefined) {
      throw createHttpError(404, 'group not found');
    }
    ctx.type = '.json';
    ctx.body = JSON.stringify(group, null, '  ');
    return group;
  });

export default compose([router.routes(), router.allowedMethods()]);
