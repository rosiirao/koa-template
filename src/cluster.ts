import cluster from 'cluster';
import os from 'os';
import httpServer, { startServer, serverSite } from './server';

import { logger } from './logger';

import config from 'config';
const conf: {
  APP_WORKER_COUNT?: number;
} = config.has('cluster') && config.get('cluster');

const numCPUs = os.cpus().length;
const numWorkers = Math.max(
  conf?.APP_WORKER_COUNT ?? Math.floor(numCPUs / 2),
  1
);

enum TER_MSG {
  QUIT,
}

if (cluster.isMaster) {
  logger.verbose(`server start!`);

  process.title = 'hello-node-master';

  logger.info(`Master ${process.pid} is running`, () => {
    console.log('Master running log finished');
  });

  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();

    worker.on('message', (m) => {
      if (m.type === 'log') {
        logger.verbose(m.content);
      }
    });
  }

  let count = 0;
  cluster.on('listening', (worker) => {
    count++;
    logger.info(
      `worker ${count}/${numWorkers}\t : ${worker.process.pid} is listening`
    );
    if (count === numWorkers) {
      logger.info(`You can open ${serverSite} in the browser.`);
    }
  });
  // cluster.on('')

  cluster.on('disconnect', (worker) => {
    worker.removeAllListeners();
    logger.info(`worker ${worker.process.pid} disconnected`);
  });

  cluster.on('exit', () => {
    count--;
    if (count === 0) {
      cluster.removeAllListeners();
      logger.verbose(`server exit`);
      process.nextTick(() => {
        process.exit();
      });
    }
  });

  process.stdin.on('data', function (data) {
    const cmd = data.toString().trim().toUpperCase();
    if (cmd in TER_MSG) {
      Object.values(cluster.workers).forEach((worker) => {
        worker.send(TER_MSG.QUIT);
        worker.disconnect();
      });
    }
  });

  process.stdin.resume();
  process.on('SIGINT', () => {
    logger.info('Master Received SIGINT.  Press Control-D to exit.');
  });
} else {
  httpServer.then((server) => {
    server.on('request', () => {
      process.send({
        type: 'log',
        content: `response worker id ${process.pid}`,
      });
    });

    startServer(server);

    process.on('message', (m) => {
      switch (m) {
        case TER_MSG.QUIT: {
          process.removeAllListeners();
          server.removeAllListeners();
          server.close(() => {
            server.unref();
            logger.info(`worker ${process.pid} server closed completed`);
            process.exit();
          });
          break;
        }
        default: {
          logger.info(`unknown supported command ${TER_MSG[m]}`);
        }
      }
    });
  });
}
