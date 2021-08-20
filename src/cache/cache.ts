import Koa from 'koa';
import NodeCache from 'node-cache';

/**
 * For cluster, only create catch on main process.
 */
let mainCache: NodeCache;

/**
 * Get NodeCache by key, if not exists, create a new one.
 * For cluster, only create Node on main process.
 */
const mainCatchGetIf = (key: string): NodeCache => {
  if (key === undefined) {
    throw new Error("Cache key can't be empty!");
  }
  if (!mainCache.has(key)) {
    mainCache = new NodeCache();
  }
  return mainCache.get(key);
};

/**
 *
 */
export const cache: Koa.Middleware = async (_, next): Promise<void> => {
  await next();
};

export const c = () => ({
  get: (key: string): NodeCache => mainCatchGetIf(key),
  set: <T>(key: string, value: T, ttl?: string | number) =>
    mainCache.set<T>(key, value, ttl),
});
