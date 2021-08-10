import api from './api';
import auth from './auth';
import files from './files';
import user from './user';

import compose from 'koa-compose';

export default compose([api, auth, files, user].filter((c) => c !== undefined));
