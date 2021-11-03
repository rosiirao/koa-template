import config from 'config';

const logConf:
  | {
      ACCESS_LOG?: boolean;
      LOG_MAX_FILES?: string | number;
    }
  | undefined = config.has('log') ? config.get('log') : undefined;

export default logConf;
