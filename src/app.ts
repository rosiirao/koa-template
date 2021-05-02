import Koa from 'koa';

import routes from './routes';
import logger from './logger';

import { IUserState } from './app.d';

// import send from 'koa-send';

const startApp = (): Koa => {
  const app = new Koa<unknown, IUserState>();
  app.use(logger(app));

  /**
   * redirect to index.html
   */
  app.use(async (ctx, next) => {
    if (ctx.path === '/' || ctx.path === '') {
      ctx.status = 301;
      ctx.set('location', `${ctx.origin}/index.html`);
      return;
    }
    await next();
  });

  // app.use(async (ctx, _) => {
  //   await send(ctx, ctx.path, { root: __dirname + '/public' });
  // });
  app.use(routes);
  return app;
};

export default startApp;
export { IUserState };
