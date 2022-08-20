import createPromise from './promise-util.js';
import cluster from 'cluster';

export interface Message<T> {
  type: string;
  payload: T;
  pid: number;
}

type Channel = string;
export const publish = <T>(
  channel: Channel,
  payload: T,
  worker?: typeof cluster.worker
): void => {
  const message: Message<T> = {
    type: channel,
    payload,
    pid: process.pid,
  };
  if (cluster.isWorker) {
    process.send?.(message);
    return;
  }
  if (worker !== undefined) {
    worker.send(message);
    return;
  }
  for (const id in cluster.workers) {
    cluster.workers[id]?.send(message);
  }
};

const subscribeMap = new Map<Channel, Parameters<typeof process.on>[1]>();

export type Subscriber<T> = AsyncGenerator<T, void, unknown>;

/**
 * Subscribe a channel, return message and the sender process id.
 */
export const subscribeWithId = async function* <T>(
  channel: Channel
): Subscriber<[payload: T, pid: number]> {
  type MessageResponse = [payload: T, pid: number];
  let [nextValue, setValue] = createPromise<MessageResponse>();
  const handler = ({ type, payload, pid }: Message<T>) => {
    if (type === channel) setValue([payload, pid]);
  };
  subscribeMap.set(channel, handler);
  if (cluster.isPrimary) {
    for (const id in cluster.workers) {
      cluster.workers[id]?.on('message', handler);
    }
  } else {
    process.on('message', handler);
  }
  while (true) {
    yield await nextValue;
    // subscribe has been cancelled, return
    if (!subscribeMap.has(channel)) return;
    [nextValue, setValue] = createPromise<MessageResponse>();
  }
};

export const subscribe = async function* <T>(channel: Channel): Subscriber<T> {
  const subscriber = subscribeWithId<T>(channel);
  for (
    let { value, done } = await subscriber.next();
    !done;
    { value, done } = await subscriber.next()
  ) {
    if (value === undefined) return;
    yield value[0];
  }
};

export const unsubscibe = (channel: Channel): void => {
  const handler = subscribeMap.get(channel);
  if (handler === undefined) return;
  if (cluster.isPrimary) {
    for (const id in cluster.workers) {
      cluster.workers[id]?.off('message', handler);
    }
  } else {
    process.off('message', handler);
  }
  subscribeMap.delete(channel);
};
