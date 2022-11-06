import Router from '@koa/router';
import createHttpError from 'http-errors';
import compose from 'koa-compose';
import body from 'koa-body';
import {
  createApplication,
  deleteApplication,
  getApplication,
  updateApplication,
} from '../../controllers/application.controller/application.controller.js';
import {
  authorizeApplication,
  authorizeRoute,
} from '../application.authorize.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/index.js';
import { prismaErrorHandler } from '../shared.route.js';

const router = authorizeRoute(
  new Router({
    prefix: '/application',
  })
);

authorizeApplication(router, 'names');

router.get('/:id?', async (ctx) => {
  const { id } = ctx.params;
  const application = await getApplication(id);

  if (application == undefined) {
    throw createHttpError(404, 'Application not found');
  }
  ctx.type = '.json';
  ctx.body = JSON.stringify(application);
  return application;
});

router
  .post('/', body.koaBody(), async (ctx) => {
    const data = ctx.request.body;
    if (data?.name === undefined) {
      throw createHttpError(422, 'The field *name* is required');
    }
    if (ctx.state.privilege?.applicationId === undefined) {
      throw new Error(
        'The action need create privileges to *names*, use authorizeApplication before action'
      );
    }

    try {
      ctx.body = await createApplication(data, ctx.state.identities.id);
    } catch (e) {
      prismaErrorHandler(e);
    }
  })
  .put('/:id', body.koaBody(), async (ctx) => {
    const data = ctx.request.body;
    if (data?.name === undefined) {
      throw createHttpError(422, 'The field *name* is required');
    }
    if (ctx.state.privilege?.applicationId === undefined) {
      throw new Error(
        'The action need create privileges to *names*, use authorizeApplication before action'
      );
    }

    const id = Number(ctx.params.id);
    try {
      ctx.body = await updateApplication({ id }, data);
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw createHttpError(
          422,
          `The name *${data.name}* is conflicted with one of other applications`
        );
      }
      throw e;
    }
  })
  .delete('/:id', async (ctx) => {
    if (ctx.state.privilege?.applicationId === undefined) {
      throw new Error(
        'The action need create privileges to *names*, use authorizeApplication before action'
      );
    }

    const id = Number(ctx.params.id);
    try {
      ctx.body = await deleteApplication({ id });
    } catch (e) {
      prismaErrorHandler(e);
    }
  });

export default compose([router.routes(), router.allowedMethods()]);
