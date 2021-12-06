import Koa from 'koa';

import routes from './routes';
import logger from './logger';

import { IUserState } from './app.d';

const startApp = (): Koa => {
  const app = new Koa<IUserState>();
  app.use(async (ctx, next) => {
    await next().catch((err) => {
      ctx.throw(err.statusCode || err.status || 500, err);
    });
  });
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

  app.use(routes);
  return app;
};

export default startApp;
export {
  IIdentityState,
  IPrivilege,
  ISubject,
  IUserState,
  AuthorizedState,
} from './app.d';
