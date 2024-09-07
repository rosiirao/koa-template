import type Koa from 'koa';
import send from 'koa-send';

const files: (path: string, root: string) => Koa.Middleware =
  (path, root) => async (ctx) => {
    return await send(ctx, path, {
      root,
    });
  };

export default files;
