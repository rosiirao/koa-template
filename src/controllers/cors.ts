import type Koa from 'koa';
import Router from '@koa/router';

export const corsHeaders = (
  ctx: Koa.DefaultContext
): { [key: string]: string } | void => {
  const refererOrigin = (ctx.header.referer ?? '').replace(
    /(^https?:\/\/[^:/]+(?::\d+)?).*/i,
    '$1'
  );
  if (refererOrigin !== '') {
    return {
      'Access-Control-Allow-Origin': refererOrigin,
    };
  }
};

export const cors: Router.Middleware = (
  ctx: Koa.DefaultContext,
  next: Koa.Next
) => {
  const headers = corsHeaders(ctx);
  if (headers !== undefined) {
    ctx.set(headers);
  }
  return next();
};
