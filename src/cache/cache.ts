import Koa from 'koa';
import NodeCache from 'node-cache';

import { nextId } from '../utils';
import createPromise from '../utils/promise-util';
import createHttpError from 'http-errors';

import cluster from 'cluster';

/**
 * For cluster, only create one cache on main process.
 */
let clusterCache: Cache;

export const cache: Koa.Middleware = async (ctx, next): Promise<void> => {
  const query = new URLSearchParams(ctx.querystring);
  if (!query.has('key')) {
    throw createHttpError(422, 'The key in query can not empty');
  }
  if (!query.has('value')) {
    const value = await clusterCache.get(query.get('key'));
    ctx.body = value;
  } else {
    await clusterCache.set(query.get('key'), query.get('value'));
  }
  await next();
};

// get: (key: string): NodeCache => mainCatchGetIf(key),
// set: <T>(key: string, value: T, ttl?: string | number) =>
//   mainCache.set<T>(key, value, ttl),
interface Cache {
  get: <T>(key: string) => T | PromiseLike<T>;
  set: <T>(key: string, value: T, ttl?: string | number) => void;
  take: <T>(key: string) => T | PromiseLike<T>;
  ttl?: (key: string, ttl: number) => void;
  clear?: () => void;
}

type MessageOp<T> = {
  [P in keyof T]: {
    id: string;
    action: P;
    arg: T[P] extends (...args: never[]) => unknown ? Parameters<T[P]> : T[P];
  };
}[keyof T];

const MESSAGE_OP_CACHE = 'op/cache';

import { Message, publish, subscribe } from '../utils';

interface CacheMessage extends Message<MessageOp<Cache>> {
  type: typeof MESSAGE_OP_CACHE;
}
interface CacheMessageResponse<T> extends Message<{ id: string; data: T }> {
  type: typeof MESSAGE_OP_CACHE;
}

/**
 * Provide receive and handle the cache request
 */
export const createCacheProvider = async (): Promise<void> => {
  if (!cluster.isPrimary) {
    throw new Error('Cache Provider can only be created in Master process');
  }
  const cache: Cache = clusterCache ?? new NodeCache();
  const sub = subscribe<MessageOp<Cache>>(MESSAGE_OP_CACHE);
  for (
    let { value: payload, done } = await sub.next();
    !done;
    { value: payload, done } = await sub.next()
  ) {
    if (typeof payload === 'undefined') return;
    const { action, arg, id } = payload as MessageOp<Cache>;
    // eslint-disable-next-line prefer-spread
    const value = cache[action].apply(cache, arg);
    if (id !== undefined) {
      publish<CacheMessageResponse<typeof value>['payload']>(MESSAGE_OP_CACHE, {
        id,
        data: value,
      });
    }
  }
  clusterCache = cache;
};

/**
 * Consumer send cache action request to master process
 */
export const createCacheConsumer = (): void => {
  if (!cluster.isWorker) {
    throw new Error('Cache Consumer can only be created in Worker process');
  }
  const sub =
    subscribe<CacheMessageResponse<never>['payload']>(MESSAGE_OP_CACHE);
  const cache: Cache = {
    set: (key, value, ttl) => {
      publish(MESSAGE_OP_CACHE, {
        action: 'set',
        arg: [key, value, ttl],
      });
    },
    get: async <T>(key: string) => {
      // publish request T
      // receive message T
      const messageId = `${process.pid}-${nextId()}`;
      return cacheActionByChannel<T>(sub, {
        action: 'get',
        arg: [key],
        id: messageId,
      });
    },
    take: <T>(key: string) => {
      const messageId = `${process.pid}-${nextId()}`;
      return cacheActionByChannel<T>(sub, {
        action: 'take',
        arg: [key],
        id: messageId,
      });
    },
  };
  clusterCache = cache;
};

async function cacheActionByChannel<T>(
  sub: AsyncGenerator<CacheMessageResponse<T>['payload'], void, unknown>,
  payload: CacheMessage['payload']
) {
  publish<CacheMessage['payload']>(MESSAGE_OP_CACHE, payload);
  const [value, setValue, setError] = createPromise<T>();
  const ttl = setTimeout(() => {
    setError(
      new Error(`Can' get cache: timeout, action: cache.${payload.action}`)
    );
  }, 1000);
  for (
    let nextSub = await sub.next();
    !nextSub.done;
    nextSub = await sub.next()
  ) {
    if (typeof nextSub.value === 'undefined') continue;
    const { id, data } = nextSub.value;
    if (id === payload.id) {
      setValue(data as T);
      clearTimeout(ttl);
      return value;
    }
  }
  throw new Error("Can' get cache: cache channel subscribe closed!");
}

export { clusterCache };
