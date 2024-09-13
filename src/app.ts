import Koa from 'koa';

import routes from './routes/index.js';
import logger from './logger/index.js';
import config from 'config';

import type { IUserState } from './app.d.js';


const startApp = (): Koa => {
  const app = new Koa<IUserState>();
  app.use(async (ctx: Koa.DefaultContext, next: Koa.Next) => {
    await next().catch((err) => {
      ctx.throw(err.statusCode || err.status || 500, err);
    });
  });
  app.use(logger(app));

  /**
   * redirect to homepage
   */
  app.use(async (ctx: Koa.DefaultContext, next: Koa.Next) => {
    if (ctx.path === '/' || ctx.path === '') {
      ctx.status = 301;
      const homepage = config.has("homepage") ? config.get<string>('homepage').replace(/^(\/|\.\/)/, '') : 'index.html'
      ctx.set('location', `${ctx.origin}/${homepage}`);
      return;
    }
    await next();
  });

  /**
   * An example for testing xhr progress
   */
  app.use(async (ctx: Koa.DefaultContext, next: Koa.Next) => {
    if (ctx.path === '/progress') {
      ctx.res.writeHead(200, {
        'Content-Length': Buffer.byteLength('中', 'utf-8') * 5000,
        'Content-Type': 'text/plain;charset=utf-8',
      });
      for (let i = 0; i < 5000; i++) {
        ctx.res.write('中', 'utf-8');
        if (i % 1000 === 0) {
          await new Promise((r) => setTimeout(r, 100));
        }
      }
      ctx.res.end();
      return;
    }
    await next();
  });

  app.use(routes);
  return app;
};

export default startApp;
export type {
  IIdentityState,
  IPrivilege,
  ISubject,
  IUserState,
  AuthorizedState,
} from './app.d.js';
