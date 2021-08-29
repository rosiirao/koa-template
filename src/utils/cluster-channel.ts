import createPromise from './promise-util';
import cluster from 'cluster';

export interface Message<T> {
  type: string;
  payload: T;
}

type Channel = string;
export const publish = <T>(
  channel: Channel,
  payload: T,
  worker?: typeof cluster.worker
): void => {
  const message = {
    type: channel,
    payload,
  };
  if (cluster.isWorker) {
    process.send(message);
    return;
  }
  if (worker !== undefined) {
    worker.send(message);
    return;
  }
  for (const id in cluster.workers) {
    cluster.workers[id].send(message);
  }
};

const subscribeMap = new Map<Channel, (...arg: never[]) => unknown>();

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const subscribe = async function* <T>(channel: Channel) {
  let [promise, ok] = createPromise<T>();
  const handler = ({ type, payload }: Message<T>) => {
    if (type === channel) ok(payload);
  };
  subscribeMap.set(channel, handler);
  if (cluster.isPrimary) {
    for (const id in cluster.workers) {
      cluster.workers[id].on('message', handler);
    }
  } else {
    process.on('message', handler);
  }
  while (true) {
    yield await promise;
    // subscribe has been cancelled, return
    if (!subscribeMap.has(channel)) return;
    [promise, ok] = createPromise<T>();
  }
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const unsubscibe = (channel: Channel) => {
  const handler = subscribeMap.get(channel);
  if (handler === undefined) return;
  if (cluster.isPrimary) {
    for (const id in cluster.workers) {
      cluster.workers[id].off('message', handler);
    }
  } else {
    process.off('message', handler);
  }
  subscribeMap.delete(channel);
};
