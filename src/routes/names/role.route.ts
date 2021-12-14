import Router from '@koa/router';
import body from 'koa-body';
import compose from 'koa-compose';
import { jsonStringify } from '../../utils';
import {
  createRole,
  deleteInheritRole,
  deleteRole,
  findRoles,
  getRole,
  inheritRole,
  updateRole,
} from '../../controllers/application.controller/names/role.controller';
import { authorizeParamRoute } from '../application.authorize';
import { prismaErrorHandler } from '../shared.route';

const router = authorizeParamRoute(
  new Router({
    prefix: '/application',
  }),
  {
    applicationName: 'applicationName',
  }
);

router
  .get('/:applicationName/role', async (ctx) => {
    try {
      ctx.body = await findRoles(ctx.state.subject.applicationId);
    } catch (e) {
      prismaErrorHandler(e);
    }
  })
  .post('/:applicationName/role', body(), async (ctx) => {
    try {
      ctx.body = await createRole(
        ctx.request.body,
        ctx.state.subject.applicationId
      );
    } catch (e) {
      prismaErrorHandler(e);
    }
  })
  .get('/:applicationName/role/:id', async (ctx) => {
    const {
      subject: { applicationId },
    } = ctx.state;
    try {
      ctx.body = await getRole(Number(ctx.params.id), applicationId);
    } catch (e) {
      prismaErrorHandler(e);
    }
  })
  .put('/:applicationName/role/:id', body(), async (ctx) => {
    const {
      subject: { applicationId },
    } = ctx.state;
    try {
      ctx.body = await updateRole(
        Number(ctx.params.id),
        ctx.request.body,
        applicationId
      );
    } catch (e) {
      prismaErrorHandler(e);
    }
  })
  .delete('/:applicationName/role/:id', async (ctx) => {
    const {
      subject: { applicationId },
    } = ctx.state;
    try {
      ctx.body = await deleteRole(Number(ctx.params.id), applicationId);
    } catch (e) {
      prismaErrorHandler(e);
    }
  });

router
  .put('/:applicationName/roleInherit/:id/:inheritTo', async (ctx) => {
    const { id, inheritTo } = ctx.params;
    ctx.body = await inheritRole(Number(id), Number(inheritTo));
  })
  .delete('/:applicationName/roleInherit/:id/:inheritTo', async (ctx) => {
    const { id, inheritTo } = ctx.params;
    ctx.body = await deleteInheritRole(Number(id), Number(inheritTo));
  });

router.get('/:applicationName/userIdentities', async (ctx) => {
  const { user, identities, privilege, subject } = ctx.state;
  ctx.body = jsonStringify({ user, identities, privilege, subject }, '  ');
});

export default compose([router.routes(), router.allowedMethods()]);
