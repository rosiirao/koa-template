import config from 'config';
import './dotenv/config.js';
import startCluster from './cluster.js';
import cluster from 'cluster';

const appConf:
  | {
    NAME: string;
  }
  | undefined = config.has('application')
    ? config.get('application')
    : undefined;
const appName = appConf?.NAME ?? 'koaApplication';
process.title = cluster.isPrimary ? appName : `${appName}-ser`;

const clusterConf: {
  APP_WORKER_COUNT: number;
} = (config.has('cluster') ? config.get('cluster') : undefined) ?? {
  APP_WORKER_COUNT: 2,
};

const numWorkers = clusterConf.APP_WORKER_COUNT;

startCluster(numWorkers);
