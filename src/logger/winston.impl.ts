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

const { errors, printf, combine } = winston.format;
const errorsFormat = errors({ stack: true });

type MyTransformFunction = <T extends winston.LogEntry>(
  info: T,
  opt?: DailyRotateFileTransportOptions
) => boolean | T;

/**
 *
 * timestampFormatter format timestamp
 */
const timestampFormatter = new Intl.DateTimeFormat(['en-US', 'zh-CN'], {
  year: '2-digit',
  month: 'numeric',
  day: 'numeric',
  hour12: false,
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  timeZoneName: 'short',
});

/**
 *
 * plainFormat format info to plain text
 */
const plainFormat = printf((info) => {
  const {
    level,
    pid = process.pid,
    message,
    timestamp = timestampFormatter.format(new Date()),
    padding,
    stack,
    path,
    ...meta
  } = info;
  const paddingComputed = (padding && padding[level]) ?? ' ';
  const printStack = [pid, level];
  if (path !== undefined) {
    printStack.push(path);
  }
  if (stack !== undefined) {
    printStack.push(stack);
  } else {
    printStack.push(message);
  }
  return `[${timestamp}]${[
    ...printStack,
    ...Object.values(meta).map((d) => d ?? '_'),
  ].join(paddingComputed)}`;
});

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
    format?: ReturnType<typeof combine>;
  }
) {
  const ignoreFormat = ignoreFormatWrapper(level, options);
  const format = options?.format ?? plainFormat;
  return new DailyRotateFile(
    Object.assign(
      {
        filename: path.join('logs', filename.replace(/\.log$/gi, '-%DATE%')),
        extension: path.extname(filename),
        frequency: 'daily',
        datePattern:
          'YYYYMMDD' /** The option will infect the rotate frequency of log's file */,
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
 *
 * sendTransform create a transform which send log message, logger master listen the message to log
 * @param messageType
 */
const sendTransform =
  (messageType = DEFAULT_MESSAGE_TYPE) =>
  (info: winston.LogEntry): false => {
    process.send({
      type: messageType,
      timestamp: timestampFormatter.format(new Date()),
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
  listeners?: string[];
};

/**
 *
 * The default log message type value the slaver work send to master
 */
const DEFAULT_MESSAGE_TYPE = 'log';

/**
 *
 * addListener add listener to listen worker's message of log
 * @param workers
 */
const addListener = (
  messageType = DEFAULT_MESSAGE_TYPE,
  workers: typeof cluster.workers
): void => {
  if (loggerInstance === undefined) {
    createLogger(true, messageType, workers);
  } else {
    const listeners = (loggerInstance.listeners =
      loggerInstance.listeners ?? []);
    const logger = loggerInstance.logger;
    const listener = ({
      type,
      payload,
    }: {
      type: string;
      payload: winston.LogEntry;
    }) => {
      if (type === messageType) {
        logger.log(Object.assign({ pid: process.pid }, payload));
      }
    };
    for (const id in workers) {
      if (!listeners.includes(id)) {
        const worker = workers[id];
        worker.on('message', listener);
        worker.on('exit', () => {
          const index = listeners.indexOf(id);
          listeners.splice(index, 1);
        });
        listeners.push(id);
      }
    }
  }
};

/**
 *
 * createLogger will initial variable loggerInstance,
 * and return loggerInstance.logger
 * repeatedly calling the method will reinitialize loggerInstance.
 * The master logger can receive listened worker's info and log
 * The slaver logger will send info to listener.
 * The master logger must use addListener to listen slaver worker logger's info.
 * @param loggerMaster
 * @param messageType   The type value of the log message the slaver send to master
 */
const createLogger = (
  loggerMaster = false,
  messageType = DEFAULT_MESSAGE_TYPE,
  workers?: typeof cluster.workers
): winston.Logger => {
  const level = 'info';
  let logger: winston.Logger;
  if (loggerMaster) {
    logger = createMainLogger(level);
    loggerInstance = { logger, isMaster: loggerMaster, listeners: [] };
    if (workers !== undefined) {
      addListener(messageType, workers);
    }
  } else {
    logger = createChildLogger(level, messageType);
    loggerInstance = { logger, isMaster: loggerMaster };
  }

  if (logConf?.ACCESS_LOG) {
    logger.add(createFileTransport('access.log', 'http', { levelsOnly: true }));
  }

  //
  // If we're not in production then log to the console,
  // add console log upon level info.
  //
  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: combine(
          ignoreFormatWrapper(logger.level, {
            ignoreLevels: ['error', 'warn', 'info'],
          }),
          plainFormat
        ),
      })
    );
  }
  return logger;
};

/**
 * main logger write log to files
 */
const createMainLogger = (level = 'info') => {
  const format = plainFormat;
  return winston.createLogger({
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
        format: combine(errorsFormat, format),
      }),
      new winston.transports.Console({ level: 'info' }),
    ],
  });
};

/**
 * child logger send messages to main logger
 */
const createChildLogger = (
  level = 'info',
  sendMessageType = DEFAULT_MESSAGE_TYPE
) => {
  const format = winston.format(sendTransform(sendMessageType))();
  return winston.createLogger({
    level,
    format: combine(errorsFormat, format),
  });
};

/**
 * getLogger return the logger current process can use.
 */
const getLogger = (): winston.Logger => {
  if (loggerInstance?.logger === undefined) {
    const logger = createLogger(true);
    logger.warn('Logger is not created exactly, default options will be used!');
    return logger;
  }
  return loggerInstance.logger;
};

/**
 *
 * finishLogger call logger.end() and return a promise when logger finished.
 */
const finishLogger = async (): Promise<void> => {
  const logger = loggerInstance?.logger;
  if (logger !== undefined) {
    const transportsFinished = logger.transports.map((t) => {
      return new Promise<void>((resolve) => {
        t.on('finish', () => {
          resolve();
        });
      });
    });
    const loggerFinished = Promise.all(transportsFinished).then(() => {
      // set a timeout to wait writing file completed.
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });
    });
    logger.end();
    return loggerFinished;
  }
};

export default getLogger;
export { getLogger, createLogger, addListener, finishLogger };
