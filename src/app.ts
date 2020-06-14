import Koa from 'koa';

import route from './routes';

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
}

import logger from './logger';

const startApp = (): Koa => {
  const app = new Koa();
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
