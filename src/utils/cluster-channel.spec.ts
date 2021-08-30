import { publish, subscribe, unsubscibe } from './cluster-channel';
import cluster from 'cluster';
import createPromise from './promise-util';

/**
 *  the cluster message event is unavailable in jest, so we have to skip this test now
 */
describe.skip('channel test', () => {
  beforeAll(() => {
    if (cluster.isPrimary) {
      cluster.fork();
    }
  });
  test(`${
    cluster.isPrimary ? 'Primary' : 'Worker'
  } publish and subscribe test`, async () => {
    const channel = 'test';
    const subscribeReady = 'subscribe_ready';
    if (cluster.isPrimary) {
      const [workerClosed, setWorkerClosed] = createPromise<void>();
      for (const id in cluster.workers) {
        const worker = cluster.workers[id]!;
        worker.on('exit', () => {
          setWorkerClosed();
        });
        worker.on('online', () => {
          // now notify worker to publish message;
          worker.send(subscribeReady);
        });
      }
      const sub = subscribe<number>(channel);
      expect((await sub.next()).value).toBe(1);
      expect((await sub.next()).value).toBe(100);
      expect((await sub.next()).value).toBe(100);
      unsubscibe(channel);
      await workerClosed;
    }
    if (cluster.isWorker) {
      const [promise, ok] = createPromise();
      process.on('message', (d: string) => {
        if (d === subscribeReady) {
          ok();
        }
      });
      setTimeout(() => ok(), 2000);
      await promise;
      publish(channel, 100);
      publish(channel, 1000);
      publish(channel, 100);
    }
  });
});
