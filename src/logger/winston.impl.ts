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

const { errors, printf, timestamp, combine } = winston.format;

type MyTransformFunction = <T extends winston.LogEntry>(
  info: T,
  opt?: DailyRotateFileTransportOptions
) => boolean | T;

const printfLog = printf((info) => {
  const {
    level,
    pid,
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
  return `${[...printStack, ...Object.values(meta)].join(paddingComputed)}`;
});

const logFormat = combine(errors({ stack: true }), timestamp(), printfLog);

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
 * @param options add levels option to filter log
 *
 */
const createFileTransport = function (
  filename: string,
  level?: string,
  options?: { ignoreLevels?: string[]; levelsOnly?: boolean }
) {
  const ignoreFormat = ignoreFormatWrapper(level, options);
  return new DailyRotateFile(
    Object.assign(
      {
        filename: path.join(
          'logs',
          filename.replace(/\.log$/gi, '-%DATE%.log')
        ),
        level,
        maxSize: 4 << 20 /* bytes */,
        maxFiles: logConf?.LOG_MAX_FILES || '14d',
      },
      options,
      ignoreFormat && {
        format: combine(ignoreFormat, logFormat),
      }
    )
  );
};

const logger = winston.createLogger({
  level: 'verbose',
  format: logFormat,
  defaultMeta: { pid: process.pid },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    createFileTransport('error.log', 'warn'),
    createFileTransport('info.log', 'info', {
      ignoreLevels: ['error'],
    }),
    new winston.transports.Console({ level: 'info' }),
    createFileTransport('verbose.log', 'verbose', { levelsOnly: true }),
  ],
});

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
        logFormat
      ),
    })
  );
}

export default logger;
