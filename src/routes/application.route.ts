import {
  authorize,
  authorizeApplicationState,
  authorizeResourceState,
  loadApplicationByParam,
  loadResourceByParam,
} from '../controllers/application.controller/authorize.controller';
import { verifyAuthToken } from '../controllers/auth.controller';
import { AuthorizedState } from '../app';

import Router from '@koa/router';
import { findACL } from '../query/acl.query/names.acl.query';
import { match } from 'path-to-regexp';

/**
 * Authorize the application and the optional resource with the applicationName and optional resourceId in path
 * It will assign the *IIdentityState* and *ISubject* into *ctx.state*
 * @param router
 * @param paramsName The route path contains applicationName and optional resourceId param
 */
export const authorizeParamRoute = (
  router: Router<AuthorizedState>,
  paramsName?: {
    applicationName: string;
    resourceId?: string;
  }
) => {
  router.use(verifyAuthToken).use(authorize);
  if (paramsName === undefined) return router;

  const { applicationName, resourceId } = paramsName;
  router.param(applicationName, loadApplicationByParam);
  if (resourceId !== undefined)
    router.param('resourceId', loadResourceByParam(findACL));
  return router;
};

/**
 * Authorize the application and the optional resource with the applicationName and optional resourceId in path
 * It will assign the *IIdentityState* and *ISubject* into *ctx.state*
 * @param root
 * @param path The route path contains applicationName and optional resourceId param
 * @param findACL The function to get resource data including ACL data
 */
export const authorizeRoute = (
  router: Router<AuthorizedState>,
  path?: {
    params: {
      applicationName: string;
      resourceId?: string;
    };
    /** Parameterized path, eg. /user/:id */
    parameterizedPath: string;
  },
  findACL?: Parameters<typeof loadResourceByParam>[0]
) => {
  router.use(verifyAuthToken).use(authorize);
  if (path === undefined) return router;

  router.use(async (ctx, next) => {
    const matched = match<Record<string, string>>(path.parameterizedPath, {
      end: true,
    })(ctx.path);
    if (!matched) return next();

    const { params } = matched;
    const applicationName = params[path.params.applicationName];
    const state = ctx.state;
    const applicationState = {
      ...state,
      ...(await authorizeApplicationState(applicationName, state, ctx.method)),
    };

    const resourceId = path.params.resourceId && params[path.params.resourceId];
    if (resourceId === undefined || !isFinite(Number(resourceId))) {
      ctx.state = applicationState;
      return next();
    }

    const resourceState = {
      ...state,
      ...(await authorizeResourceState(findACL)(
        Number(resourceId),
        applicationState
      )),
    };

    ctx.state = resourceState;
    return next();
  });
  return router;
};
