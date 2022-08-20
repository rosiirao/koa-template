import createHttpError from 'http-errors';
import Koa from 'koa';
import { clusterCache } from '../cache/index.js';

export const cache: Koa.Middleware = async (ctx, next): Promise<void> => {
  const query = new URLSearchParams(ctx.querystring);
  if (!query.has('key')) {
    throw createHttpError(422, 'The key in query can not empty');
  }
  const key = query.get('key')!;
  if (!query.has('value')) {
    const value = await clusterCache.get(key);
    ctx.body = value;
  } else {
    await clusterCache.set(key, query.get('value'), 1000);
    ctx.status = 204;
  }
  await next();
};

export default cache;
