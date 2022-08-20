import api from './api.js';
import auth from './auth.route.js';
import files from './files.js';
import names from './names/index.js';
import test from './test.router.js';

import Koa from 'koa';
import compose from 'koa-compose';

/**
 * A composed middle ware to handle routers
 */
export default compose(
  [api, auth, files, test, names].filter(
    (c) => c !== undefined
  ) as Koa.Middleware[]
);
