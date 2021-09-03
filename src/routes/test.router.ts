import Router from '@koa/router';
import compose from 'koa-compose';
import cache from '../controllers/cache.controller';

const router = new Router({
  prefix: '/test',
});

router.get('/cache', cache);

export default compose([router.routes(), router.allowedMethods()]);
