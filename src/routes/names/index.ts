import compose from 'koa-compose';

import names from './names.route';
export * from './user.route';
export { default as user } from './user.route';

export default compose([names]);
