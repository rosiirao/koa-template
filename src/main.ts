import config from 'config';
import startCluster from './cluster';
import cluster from 'cluster';

const appConf: {
  NAME: string;
} = config.has('application') && config.get('application');
const appName = appConf?.NAME ?? 'koaApplication';
process.title = cluster.isMaster ? appName : `${appName}-ser`;

const clusterConf: {
  APP_WORKER_COUNT: number;
} = (config.has('cluster') && config.get('cluster')) ?? {
  APP_WORKER_COUNT: 2,
};

const numWorkers = clusterConf.APP_WORKER_COUNT;

startCluster(numWorkers);
