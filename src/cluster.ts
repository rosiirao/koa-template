import cluster from 'cluster';
import startServer, { serverSite } from './server.js';
import {
  createLogger,
  addListener as addLoggerListener,
  finishLogger,
} from './logger/index.js';
import { createCacheConsumer, createCacheProvider } from './cache/index.js';
import { publish, subscribe } from './utils/index.js';

enum TER_MSG {
  QUIT,
  Q, // the abbreviation for QUIT
}

const startMaster = (numWorkers: number): void => {
  const logger = createLogger(true);

  if (process.env.NODE_ENV !== 'production') {
    logger.warn(`The server is not running in production environment!`);
  }
  if (numWorkers < 1) {
    logger.warn(
      'Wrong configuration of APP_WORKER_COUNT, the value is set to 1!'
    );
    numWorkers = 1;
  }

  logger.info(`server start!`);
  logger.info(`Master ${process.pid} is running`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  createCacheProvider();
  addLoggerListener(undefined, cluster.workers);

  let count = 0;
  cluster.on('listening', (worker) => {
    count++;
    logger.info(
      `worker ${count}/${numWorkers}\t : ${worker.process.pid} is listening`
    );
    if (count === numWorkers) {
      logger.info(`You can open ${serverSite} in the browser.`);
      // add a prompt to wait user's command
      process.stdout.write('> ');
    }
  });

  cluster.on('disconnect', (worker) => {
    worker.removeAllListeners();
    logger.info(`worker ${worker.process.pid} disconnected`);
  });

  cluster.on('exit', () => {
    if (Object.keys(cluster.workers ?? []).length === 0) {
      cluster.removeAllListeners();
      process.stdin.removeAllListeners();
      logger.info(`server exit!`);
      exitProcess();
    }
  });

  process.stdin.on('data', function (data) {
    const cmd = data.toString().trim().toUpperCase();
    if (cmd in TER_MSG) {
      // Object.values(cluster.workers).forEach(() => {
      publish('system/cli', TER_MSG[cmd as keyof typeof TER_MSG]);
      // });
      return;
    }
    if (cmd.trim() !== '') {
      logger.info(`unknown command ${cmd}`);
    }
    // add a prompt to wait user's command
    process.stdout.write('> ');
  });

  process.stdin.resume();
  process.on('SIGINT', () => {
    logger.info('Master Received SIGINT.  Press Control-D to exit.');
  });
};

const startWorker = () => {
  const logger = createLogger(false);
  createCacheConsumer();
  startServer().then(async (server) => {
    const sub = subscribe<TER_MSG>('system/cli');
    for (
      let { value: command, done } = await sub.next();
      !done;
      { value: command, done } = await sub.next()
    ) {
      if (command === undefined) continue;
      switch (command) {
        case TER_MSG.Q:
        case TER_MSG.QUIT: {
          process.removeAllListeners();
          server.removeAllListeners();
          server.close(() => {
            server.unref();
            logger.info(`worker ${process.pid} server closed completed`);
            exitProcess();
          });
          break;
        }
        default: {
          logger.info(`unknown supported command ${TER_MSG[command]}`);
        }
      }
    }
  });
};

/**
 *
 * exitProcess wait finishLogger() and exit;
 */
const exitProcess = (): void => {
  finishLogger()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
};

const startCluster = (numWorkers: number): void => {
  if (cluster.isPrimary) {
    startMaster(numWorkers);
  } else {
    startWorker();
  }
};

export default startCluster;

const f = (): void | string => 'abc';

const p = (x: string) => x;

const r = f();
if (r !== undefined) {
  p(r);
}

export { r };
