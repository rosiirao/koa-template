import config from 'config';

const logConf: {
  ACCESS_LOG?: boolean;
  LOG_MAX_FILES?: string | number;
} = config.has('log') && config.get('log');

export default logConf;
