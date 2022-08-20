import Router from '@koa/router';
import compose from 'koa-compose';
import { readyz, healthz, version } from '../controllers/kubeController.js';

const router = new Router({
  prefix: '/api',
});

router.get('/healthz', healthz).get('/readyz', readyz).get('/version', version);

export default compose([router.routes(), router.allowedMethods()]);
