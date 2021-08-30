import api from './api';
import auth from './auth.route';
import files from './files';
import user from './user.route';

import Koa from 'koa';
import compose from 'koa-compose';

export default compose(
  [api, auth, files, user].filter((c) => c !== undefined) as Koa.Middleware[]
);
