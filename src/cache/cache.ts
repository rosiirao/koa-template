import NodeCache from 'node-cache';

import { nextId } from '../utils';
import createPromise from '../utils/promise-util';

import cluster from 'cluster';

/**
 * For cluster, only create one cache on main process.
 */
let clusterCache: Cache;

// get: (key: string): NodeCache => mainCatchGetIf(key),
// set: <T>(key: string, value: T, ttl?: string | number) =>
//   mainCache.set<T>(key, value, ttl),
interface Cache {
  get: <T>(this: Cache, key: string) => T | PromiseLike<T>;
  set: <T>(this: Cache, key: string, value: T, ttl?: string | number) => void;
  take: <T>(this: Cache, key: string) => T | PromiseLike<T>;
  ttl?: (this: Cache, key: string, ttlInSecond: number) => void;
  clear?: (this: Cache) => void;
}

type MessageOp<T> = NonNullable<
  {
    [P in keyof T]: {
      id: string;
      action: P;
      arg: T[P] extends ((...args: infer V) => unknown) | void ? V : T[P];
    };
  }[keyof T]
>;
const MESSAGE_OP_CACHE = 'op/cache';

import {
  Message,
  Subscriber,
  publish,
  subscribe,
  subscribeWithId,
} from '../utils';

interface CacheMessage extends Message<MessageOp<Cache>> {
  type: typeof MESSAGE_OP_CACHE;
}

type CacheResponse<T> = Message<{ id: string; data: T }>;

interface CacheMessageResponse<T> extends CacheResponse<T> {
  type: typeof MESSAGE_OP_CACHE;
}

/**
 * Provide receive and handle the cache request
 */
export const createCacheProvider = async (): Promise<void> => {
  if (!cluster.isPrimary) {
    throw new Error('Cache Provider can only be created in Master process');
  }
  const cache = clusterCache ?? new NodeCache();
  const subscriber = subscribeWithId<MessageOp<Cache>>(MESSAGE_OP_CACHE);
  for (
    let { value: request, done } = await subscriber.next();
    !done;
    { value: request, done } = await subscriber.next()
  ) {
    if (request === undefined) return;
    const [payload, pid] = request;
    const { action, id, arg } = payload;
    if (cache[action] === undefined) {
      throw new Error(`Cache.${action} is not supported`);
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: MessageOp<Cache> has assured the *arg* equals the *Parameters<Cache[typeof action]>*. so we disable ts-check on call.
    const value = cache[action](...arg);
    if (id !== undefined) {
      const worker = ((): undefined | typeof cluster.worker => {
        for (const id in cluster.workers) {
          if (cluster.workers[id]?.process.pid === pid) {
            return cluster.workers[id];
          }
        }
        return;
      })();
      publish<CacheMessageResponse<typeof value>['payload']>(
        MESSAGE_OP_CACHE,
        {
          id,
          data: value,
        },
        worker
      );
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
  const subscriber =
    subscribe<CacheResponse<never>['payload']>(MESSAGE_OP_CACHE);
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
      return cacheActionByChannel<T>(subscriber, {
        action: 'get',
        arg: [key],
        id: messageId,
      });
    },
    take: <T>(key: string) => {
      const messageId = `${process.pid}-${nextId()}`;
      return cacheActionByChannel<T>(subscriber, {
        action: 'take',
        arg: [key],
        id: messageId,
      });
    },
  };
  clusterCache = cache;
};

async function cacheActionByChannel<T>(
  subscriber: Subscriber<CacheResponse<T>['payload']>,
  payload: NonNullable<MessageOp<Cache>>
) {
  publish<CacheMessage['payload']>(MESSAGE_OP_CACHE, payload);
  const [value, setValue, setError] = createPromise<T>();
  const ttl = setTimeout(() => {
    setError(
      new Error(`Cache operation timeout, action: cache.${payload.action}`)
    );
  }, 1000);
  for (
    let nextSub = await subscriber.next();
    !nextSub.done;
    nextSub = await subscriber.next()
  ) {
    if (typeof nextSub.value === 'undefined') continue;
    const payload = nextSub.value;
    const { id, data } = payload;
    if (id === payload.id) {
      setValue(data as T);
      clearTimeout(ttl);
      return value;
    }
  }
  throw new Error("Can' get cache: cache channel subscribe closed!");
}

export { clusterCache };
