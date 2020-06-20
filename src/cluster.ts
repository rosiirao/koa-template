import cluster from 'cluster';
import startServer, { serverSite } from './server';
import {
  createLogger,
  addListener as addLoggerListener,
  finishLogger,
} from './logger';

enum TER_MSG {
  QUIT,
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
  addLoggerListener(undefined, ...Object.values(cluster.workers));

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
    if (Object.keys(cluster.workers).length === 0) {
      cluster.removeAllListeners();
      process.stdin.removeAllListeners();
      logger.info(`server exit!`);
      exitProcess();
    }
  });

  process.stdin.on('data', function (data) {
    const cmd = data.toString().trim().toUpperCase();
    if (cmd in TER_MSG) {
      Object.values(cluster.workers).forEach((worker) => {
        worker.send(TER_MSG.QUIT);
      });
    } else {
      // add a prompt to wait user's command
      process.stdout.write('> ');
    }
  });

  process.stdin.resume();
  process.on('SIGINT', () => {
    logger.info('Master Received SIGINT.  Press Control-D to exit.');
  });
};

const startWorker = () => {
  const logger = createLogger(false);

  startServer().then((server) => {
    process.on('message', (m) => {
      switch (m) {
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
          logger.info(`unknown supported command ${TER_MSG[m]}`);
        }
      }
    });
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
  if (cluster.isMaster) {
    startMaster(numWorkers);
  } else {
    startWorker();
  }
};

export default startCluster;
