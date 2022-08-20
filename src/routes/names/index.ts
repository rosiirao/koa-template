import compose from 'koa-compose';

import application from './application.route.js';
import names from './names.route.js';
import roles from './role.route.js';
export * from './user.route.js';
export { default as user } from './user.route.js';

export default compose([application, names, roles]);
