import api from './api';
import auth from './auth.route';
import files from './files';
import user from './user.route';
import test from './test.router';

import Koa from 'koa';
import compose from 'koa-compose';

export default compose(
  [api, auth, files, user, test].filter(
    (c) => c !== undefined
  ) as Koa.Middleware[]
);
