import Router from '@koa/router';
import 'koa-body';
import { ICustomAppState } from '../app';

const loginService = async function (username = '', password = '') {
  if (username === '' || password === '') {
    throw new Error('Invalid Credentials');
  }
  const token = 'abcde==';
  return token;
};

const authService = async function (token = '') {
  if (token === '') {
    throw new Error('Unauthorized');
  }
  const user = { id: 'user' };
  return user;
};

/**
 * Send Authorization token and redirect if login success, otherwise do nothing.
 * @param ctx
 */
export const login: Router.Middleware = async function (ctx) {
  const { username, password, redirectTo } = ctx.request.body;
  const token = await loginService(username, password);
  ctx.set({
    Authorization: `Bearer ${token}`,
  });
  ctx.redirect(redirectTo || '/');
  ctx.status = 302;
};

const resolveAuthToken = async function (
  ctx: Parameters<Router.Middleware>[0]
) {
  const auth = ctx.get('Authorization');
  let token: string = auth.startsWith('Bearer ')
    ? auth.substring(8)
    : undefined;

  const tokenKey = 'access_token';
  try {
    token = token ?? ctx.query[tokenKey] ?? ctx.request?.body?.[tokenKey] ?? '';
  } catch (e) {
    console.error(e);
  }

  if (token === '') {
    throw new Error('Unauthorized');
  }
  return token;
};

/**
 * Set ctx.currentUser if auth success, otherwise return 401.
 * @param ctx ctx.currentUser = user
 * @param next
 * @returns
 */
export const auth: Router.Middleware<
  unknown,
  ICustomAppState
> = async function (ctx, next) {
  return resolveAuthToken(ctx)
    .then(authService)
    .then(function (user) {
      ctx.currentUser = user;
      return next();
    })
    .catch(function () {
      ctx.throw(401);
    });
};
