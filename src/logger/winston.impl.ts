/**
 *
 * separate logs to different log files.
 */

import winston from 'winston';
import DailyRotateFile, {
  DailyRotateFileTransportOptions,
} from 'winston-daily-rotate-file';
import path from 'path';
import logConf from './config';
import cluster from 'cluster';

const { errors, printf, timestamp, combine } = winston.format;

type MyTransformFunction = <T extends winston.LogEntry>(
  info: T,
  opt?: DailyRotateFileTransportOptions
) => boolean | T;

const plainFormat = printf((info) => {
  const {
    level,
    pid = process.pid,
    message,
    timestamp,
    padding,
    stack,
    path,
    ...meta
  } = info;
  const paddingComputed = (padding && padding[level]) ?? ' ';
  const printStack = [timestamp, pid, level];
  if (path !== undefined) {
    printStack.push(path);
  }
  if (stack !== undefined) {
    printStack.push(stack);
  } else {
    printStack.push(message);
  }
  return `${[...printStack, ...Object.values(meta).map((d) => d ?? '_')].join(
    paddingComputed
  )}`;
});

/**
 *
 * defaultFormat with timestamp and plain text
 */
const defaultFormat = combine(timestamp(), plainFormat);

const ignoreFormatWrapper = (
  level: string,
  options?: {
    ignoreLevels?: string[];
    levelsOnly?: boolean;
  }
) => {
  const ignoreTransform: MyTransformFunction =
    options &&
    ('levelsOnly' in options && options.levelsOnly
      ? (info) => (info.level === level ? info : false)
      : 'ignoreLevels' in options
      ? (info) => (options.ignoreLevels.includes(info.level) ? false : info)
      : undefined);

  return ignoreTransform && winston.format(ignoreTransform)();
};

/**
 *
 * @param filename
 * @param level
 * @param options contains levels option to filter log, format for custom format
 *
 */
const createFileTransport = function (
  filename: string,
  level?: string,
  options?: {
    ignoreLevels?: string[];
    levelsOnly?: boolean;
    format?: typeof defaultFormat;
  }
) {
  const ignoreFormat = ignoreFormatWrapper(level, options);
  const format = options?.format ?? defaultFormat;
  return new DailyRotateFile(
    Object.assign(
      {
        filename: path.join('logs', filename.replace(/\.log$/gi, '-%DATE%')),
        extension: path.extname(filename),
        datePattern: 'YYYYMMDDHHmmss',
        level,
        maxSize: 4 << 20 /* bytes */,
        maxFiles: logConf?.LOG_MAX_FILES || '14d',
      },
      options,
      ignoreFormat && {
        format: combine(ignoreFormat, format),
      }
    )
  );
};

/**
 * sendTransform send log message, logger master listen the message to log
 * @param info
 */
const sendTransform: MyTransformFunction = (info) => {
  process.send({
    type: 'log',
    payload: Object.assign(info, { pid: process.pid }),
  });
  return false;
};

/**
 * logger is a winston.Logger instance wrapper, use createLogger create an instance before use it.
 */
let loggerInstance: {
  logger: winston.Logger;
  isMaster: boolean;
  listeners?: number[];
};

/**
 *
 * addListener add listener to listen worker's message of log
 * @param workers
 */
const addListener = (...workers: cluster.Worker[]): void => {
  if (loggerInstance === undefined) {
    createLogger(true, workers);
  } else {
    const listeners = (loggerInstance.listeners =
      loggerInstance.listeners || []);
    const logger = loggerInstance.logger;
    const listener = ({
      type,
      payload,
    }: {
      type: string;
      payload: winston.LogEntry;
    }) => {
      if (type === 'log') {
        logger.log(Object.assign({ pid: process.pid }, payload));
      }
    };
    for (const worker of workers) {
      if (!listeners.includes(worker.id)) {
        worker.on('message', listener);
        worker.on('exit', () => {
          const index = listeners.indexOf(worker.id);
          listeners.splice(index, 1);
        });
        listeners.push(worker.id);
      }
    }
  }
};

/**
 *
 * createLogger create an winston.Logger instance, repeatedly creating will replace the instance before created
 * @param loggerMaster
 */
const createLogger = (
  loggerMaster = false,
  workers?: cluster.Worker[]
): winston.Logger => {
  const format = loggerMaster ? defaultFormat : winston.format(sendTransform)();
  const level = 'verbose';
  let logger: winston.Logger;
  if (loggerMaster) {
    logger = winston.createLogger({
      level,
      format,
      transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        createFileTransport('error.log', 'warn'),
        createFileTransport('info.log', 'info', {
          ignoreLevels: ['error'],
          format: combine(errors({ stack: true }), format),
        }),
        new winston.transports.Console({ level: 'info' }),
        createFileTransport('verbose.log', 'verbose', { levelsOnly: true }),
      ],
    });
    loggerInstance = { logger, isMaster: loggerMaster, listeners: [] };
    if (workers && workers.length > 0) {
      addListener(...workers);
    }
  } else {
    logger = winston.createLogger({ level, format });
    loggerInstance = { logger, isMaster: loggerMaster };
  }

  if (logConf?.ACCESS_LOG) {
    logger.add(createFileTransport('access.log', 'http', { levelsOnly: true }));
  }

  //
  // If we're not in production then log to the console,
  // and filter default console log.
  //
  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: combine(
          ignoreFormatWrapper(logger.level, {
            ignoreLevels: ['error', 'warn', 'info'],
          }),
          defaultFormat
        ),
      })
    );
  }
  return logger;
};

/**
 *
 */
const getLogger = (): winston.Logger => {
  if (loggerInstance?.logger === undefined) {
    const logger = createLogger(true);
    logger.warn('Logger is not created exactly, default options will be used!');
    return logger;
  }
  return loggerInstance.logger;
};

export default getLogger;
export { getLogger, createLogger, addListener };
