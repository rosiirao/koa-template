import {
  authorize,
  authorizeApplicationState,
  authorizeResourceState,
  loadApplicationByParam,
  loadResourceByParam,
  requestMethod,
} from '../controllers/application.controller/authorize.controller.js';
import { verifyAuthToken } from '../controllers/auth.controller.js';
import { AuthorizedState } from '../app.js';

import Router from '@koa/router';
import { match } from 'path-to-regexp';
import type Koa from 'koa';

/**
 * Authorize router with the optional applicationName and resourceId in path
 * It will assign the *IIdentityState*, and the *ISubject*, *IPrivilege* if the application path parameter is present, into *ctx.state*
 * @param router
 * @param paramsName The route path contains applicationName and optional resourceId param
 */
export function authorizeParamRoute(
  router: Router<AuthorizedState>,
  paramsName?: {
    applicationName: string;
    resourceId?: string;
  },
  findACL?: Parameters<typeof loadResourceByParam>[0]
) {
  router.use(verifyAuthToken).use(authorize);
  if (paramsName === undefined) return router;

  const { applicationName, resourceId } = paramsName;
  router.param(applicationName, loadApplicationByParam);
  if (resourceId !== undefined)
    router.param('resourceId', loadResourceByParam(findACL));
  return router;
}

/**
 * Authorize router with the optional application path parameter
 * It will assign the *IIdentityState*, and the *ISubject*, *IPrivilege* if the application path parameter is present, into *ctx.state*
 * @param router
 * @param path The route path contains applicationName and optional resourceId param
 * @param findACL The function to get resource data including ACL data
 */
export function authorizeRoute(
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
) {
  router.use(verifyAuthToken).use(authorize);
  if (path === undefined) return router;

  router.use(async (ctx: Koa.DefaultContext, next: Koa.Next) => {
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
}

/**
 * Authorize the application with the optional application path parameter
 * It will assign the *IIdentityState*, and the *ISubject*, *IPrivilege* if the application path parameter is present, into *ctx.state*
 * @param route
 * @param name
 */
export function authorizeApplication(
  route: Router<AuthorizedState>,
  name: string
) {
  route.use(async (ctx, next) => {
    ctx.state = {
      ...ctx.state,
      ...(await authorizeApplicationState(name, ctx.state, requestMethod(ctx))),
    };
    return next();
  });
  return route;
}
