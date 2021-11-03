import config from 'config';
import startCluster from './cluster';
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
(async () => {
  if (process.env.NODE_ENV !== 'production') {
    const dotenv = await import('dotenv')
      .then((dotenv) => dotenv.default)
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
    dotenv.config();
  }

  startCluster(numWorkers);
})();
