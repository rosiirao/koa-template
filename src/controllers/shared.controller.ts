import Router from '@koa/router';

export function requestMethod(ctx: Router.RouterContext) {
  if (!/^patch$/i.test(ctx.method)) return ctx.method.toUpperCase();
  const method = ctx.headers['x-http-method'];
  if (typeof method !== 'string')
    throw new Error(
      'PATCH method need X-HTTP-METHOD in headers to describe http method'
    );
  return method.toUpperCase();
}
