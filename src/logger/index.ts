// import { getLogger, createLogger, addListener } from './winston.impl';
import Koa from 'koa';
import logConf from './config';
import { getLogger } from './winston.impl';

const accessLog = logConf?.ACCESS_LOG;
const appLogger = (app: Koa): Koa.Middleware => {
  const logger = getLogger();
  app.on('error', (err, ctx) => {
    const status = err.statusCode || err.status;
    if (
      status < 500 &&
      status !== 429 &&
      !/invalid_header/i.test(err.message || String(err))
    ) {
      ctx.expose = true;
      return;
    }
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

  return async (ctx, next): Promise<void> => {
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
        } ${ctx.method} ${ctx.status}  ${ctx.request.originalUrl || '_'} ${
          ctx.get('content-length') || '_'
        } ${ctx.get('refer') || '_'} ${ctx.get('user-agent') || '_'} ${
          ctx.get('x-forwarded-for') || '_'
        } ${diff[1] / 1000000}ms`
      );
    }
  };
};

export default appLogger;

// export { getLogger, createLogger, addListener };
export * from './winston.impl';
