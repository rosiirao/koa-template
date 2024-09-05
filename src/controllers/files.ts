import type Koa from 'koa';
import send from 'koa-send';

const files: (path: string, root: string) => Koa.Middleware =
  (path, root) => async (ctx: Koa.DefaultContext) => {
    return await send(ctx, path, {
      root,
    });
  };

export default files;
