import api from './api';
import auth from './auth';
import files from './files';
import fileReceive from './file-receive';
import compose from 'koa-compose';

export default compose(
  [api, auth, files, fileReceive].filter((c) => c !== undefined)
);
