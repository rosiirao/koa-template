import Router from '@koa/router';

export const corsHeaders = (
  ctx: Parameters<Router.Middleware>[0]
): { [key: string]: string | undefined } => {
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

export const cors: Router.Middleware = (ctx, next) => {
  const headers = corsHeaders(ctx);
  if (headers !== undefined) {
    ctx.set(headers);
  }
  return next();
};
