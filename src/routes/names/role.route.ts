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
  revokeRole,
  inheritRole,
  updateRole,
  grantRole,
} from '../../controllers/application.controller/names/role.controller';
import { authorizeParamRoute } from '../application.authorize';
import { prismaErrorHandler } from '../shared.route';
import { itemOfEnumerable } from '../../query/query.shared';
import { requestMethod } from '../../controllers/shared.controller';

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
      const role = itemOfEnumerable(
        await getRole(Number(ctx.params.id), applicationId)
      );
      if (role !== undefined) ctx.body = role;
    } catch (e) {
      prismaErrorHandler(e);
    }
  })
  .put('/:applicationName/role/:id', body(), async (ctx) => {
    const {
      subject: { applicationId },
    } = ctx.state;
    try {
      ctx.body = itemOfEnumerable(
        await updateRole(Number(ctx.params.id), ctx.request.body, applicationId)
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

type GrantRoleOn =
  | {
      user: Array<number>;
    }
  | { group: Array<number> };

router
  .put('/:applicationName/grantRole/:id', body(), async (ctx) => {
    const payload = ctx.request.body as GrantRoleOn;
    ctx.body = await grantRole(Number(ctx.params.id), payload);
  })
  .patch('/:applicationName/grantRole/:id', body(), async (ctx) => {
    const method = requestMethod(ctx);
    const payload = ctx.request.body as GrantRoleOn;
    if (method.toLowerCase() === 'delete') {
      ctx.body = await revokeRole(Number(ctx.params.id), payload);
      return;
    }
    throw new Error(
      `The method ${method} is not supported. Only delete is supported`
    );
  });

router.get('/:applicationName/userIdentities', async (ctx) => {
  const { user, identities, privilege, subject } = ctx.state;
  ctx.body = jsonStringify({ user, identities, privilege, subject }, '  ');
});

export default compose([router.routes(), router.allowedMethods()]);
