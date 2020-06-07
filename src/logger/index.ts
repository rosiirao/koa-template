import logger from './winston.impl';
import Koa from 'koa';
import logConf from './config';

const accessLog = logConf?.ACCESS_LOG;

const appLogger = (app: Koa): Koa.Middleware => {
  app.on('error', (err, ctx) => {
    /* centralized error handling:
     *   console.log error
     *   write error to log file
     *   save error and request information to database if ctx.request match condition
     *   ...
     */
    logger.error({
      message: err,
      path: ctx.path,
    });
  });

  return async (ctx: Koa.Context, next: Koa.Next): Promise<void> => {
    let time;
    if (accessLog) {
      time = process.hrtime();
    }
    await next();
    if (accessLog) {
      app.proxy = true;
      const diff = process.hrtime(time);
      logger.http(
        `${
          ctx.get('x-real-ip') || ctx.ips.length > 0
            ? ctx.ips[ctx.ips.length - 1]
            : ctx.ip
        } ${ctx.status}  ${ctx.request.originalUrl} ${ctx.get(
          'content-length'
        )} ${ctx.get('refer')} ${ctx.get('user-agent')} ${ctx.get(
          'x-forwarded-for'
        )} ${diff[1] / 1000000}ms`
      );
    }
  };
};

export default appLogger;

export { logger };
