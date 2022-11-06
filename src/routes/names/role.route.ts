import Router from '@koa/router';
import body from 'koa-body';
import compose from 'koa-compose';
import { jsonStringify } from '../../utils/index.js';
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
} from '../../controllers/application.controller/names/role.controller.js';
import { authorizeParamRoute } from '../application.authorize.js';
import { prismaErrorHandler } from '../shared.route.js';
import { itemOfEnumerable } from '../../query/query.shared.js';
import { requestMethod } from '../../controllers/shared.controller.js';
import { updatePrivilege } from '../../controllers/application.controller/application.controller.js';

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
  .post('/:applicationName/role', body.koaBody(), async (ctx) => {
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
  .put('/:applicationName/role/:id', body.koaBody(), async (ctx) => {
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
    const {
      subject: { applicationId },
    } = ctx.state;
    ctx.body = await inheritRole(applicationId, Number(id), Number(inheritTo));
  })
  .delete('/:applicationName/roleInherit/:id/:inheritTo', async (ctx) => {
    const { id, inheritTo } = ctx.params;
    const {
      subject: { applicationId },
    } = ctx.state;
    ctx.body = await deleteInheritRole(
      applicationId,
      Number(id),
      Number(inheritTo)
    );
  });

type GrantRoleOn =
  | {
      user: Array<number>;
    }
  | { group: Array<number> };

router
  .put('/:applicationName/grantRole/:id', body.koaBody(), async (ctx) => {
    const payload = ctx.request.body as GrantRoleOn;
    ctx.body = await grantRole(Number(ctx.params.id), payload);
  })
  .patch('/:applicationName/grantRole/:id', body.koaBody(), async (ctx) => {
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

router.put('/:applicationName/privilege', body.koaBody(), async (ctx) => {
  const { assignee, privilege } = ctx.request.body;
  const {
    subject: { applicationId },
  } = ctx.state;
  await updatePrivilege(applicationId, assignee, privilege);
  ctx.body = undefined;
});

router.get('/:applicationName/userIdentities', async (ctx) => {
  const { user, identities, privilege, subject } = ctx.state;
  ctx.body = jsonStringify({ user, identities, privilege, subject }, '  ');
});

export default compose([router.routes(), router.allowedMethods()]);
