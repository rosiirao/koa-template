// 静态文件访问

import type Koa from 'koa';
import config from 'config';
import files from '../controllers/files.js';
import Router from '@koa/router';
import compose from 'koa-compose';

type Conf = {
  path?: string;
  root?: string;
};

const defaultPath = 'files';

const conf: Conf | Array<Conf> | undefined = config.has('services.files')
  ? config.get('services.files')
  : undefined;

const filesService = (conf?: Conf | Array<Conf>) => {
  // if ((conf?.root ?? '') === '') return;
  if (conf === undefined) return;

  if (!Array.isArray(conf)) {
    const router = fileRoute(conf);
    return compose([router.routes(), router.allowedMethods()]);
  }

  return compose(
    conf.reduce<Array<Router.Middleware>>((acc, c) => {
      const router = fileRoute(c);
      acc.push(router.routes(), router.allowedMethods());
      return acc;
    }, [])
  );
};

function fileRoute(conf: Conf) {
  const publicPath = conf.path ?? defaultPath;
  const router = new Router({
    prefix:
      publicPath && `${publicPath.startsWith('/') ? '' : '/'}${publicPath}`,
  });

  const filesServe = (path: string) => files(path, conf.root ?? '');
  router.get('/:path+', async (ctx: Koa.DefaultContext, next: Koa.Next) => {
    await filesServe('/' + ctx.params.path)(ctx, next);
  });
  return router;
}

export default filesService(conf);
