import Router from '@koa/router';
import createHttpError from 'http-errors';
import compose from 'koa-compose';
import {
  listApplication,
  findUnique,
} from '../../query/application/application.query';

const router = new Router({
  prefix: '/application',
});

router.get('/:id?', async (ctx) => {
  const { id } = ctx.params;
  if (id === '' || id === undefined) {
    const allApplication = await listApplication();
    ctx.type = '.json';
    ctx.body = JSON.stringify(allApplication, null, '  ');
    return;
  }
  if (!/^\d+$/.test(id)) {
    throw createHttpError(404, 'Application not found');
  }
  const application = await findUnique({ id: Number(id) });
  if (application == undefined) {
    throw createHttpError(404, 'User not found');
  }
  ctx.type = '.json';
  ctx.body = JSON.stringify(application, null, '  ');
  return application;
});

export default compose([router.routes(), router.allowedMethods()]);
