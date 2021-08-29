import Router from '@koa/router';
import compose from 'koa-compose';
import { readyz, healthz, version } from '../controllers/kubeController';
import { cache } from '../cache';

const router = new Router({
  prefix: '/api',
});

router.get('/healthz', healthz).get('/readyz', readyz).get('/version', version);

// a test for cache
router.get('/cache', cache);

export default compose([router.routes(), router.allowedMethods()]);
