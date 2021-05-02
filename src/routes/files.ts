// 静态文件访问

import config from 'config';
import files from '../controllers/files';
import Router from '@koa/router';
import compose from 'koa-compose';

type Conf = {
  path?: string;
  root?: string;
};

const defaultPath = 'files';

const conf: Conf = config.has('services.files')
  ? config.get('services.files')
  : undefined;

const filesService = (conf: Conf) => {
  if ((conf?.root ?? '') === '') return;

  const publicPath = conf.path || defaultPath;
  const router = new Router({
    prefix: (publicPath.startsWith('/') ? '' : '/') + publicPath,
  });

  const filesServe = (path: string) => files(path, conf.root);
  router.get('/:path+', async (ctx, next) => {
    await filesServe('/' + ctx.params.path)(ctx, next);
  });
  return compose([router.routes(), router.allowedMethods()]);
};

export default filesService(conf);
