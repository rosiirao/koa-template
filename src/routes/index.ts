import api from './api';
import auth from './auth.route';
import files from './files';
import names from './names';
import test from './test.router';

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
