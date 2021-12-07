import compose from 'koa-compose';

import application from './application.route';
import names from './names.route';
export * from './user.route';
export { default as user } from './user.route';

export default compose([application, names]);
