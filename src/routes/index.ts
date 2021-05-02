import api from './api';
import auth from './auth';
import files from './files';
import compose from 'koa-compose';

export default compose([api, auth, files].filter((c) => c !== undefined));
