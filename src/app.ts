import Koa from 'koa';

import route from './routes';
import logger from './logger';

import { ICustomAppState } from './app.d';

const startApp = (): Koa => {
  const app = new Koa<unknown, ICustomAppState>();
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

  app.use(route(app));
  return app;
};

export default startApp;
export { ICustomAppState };
