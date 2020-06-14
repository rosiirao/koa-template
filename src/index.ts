import config from 'config';
import startCluster from './cluster';

const clusterConf: {
  APP_WORKER_COUNT: number;
} = (config.has('cluster') && config.get('cluster')) ?? {
  APP_WORKER_COUNT: 2,
};

const numWorkers = clusterConf.APP_WORKER_COUNT;

startCluster(numWorkers);
