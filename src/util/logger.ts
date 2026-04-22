import log4js from 'log4js';
import path from 'path';
import express from 'express';

const LOG_DIR = path.resolve(__dirname, '../../logs');

log4js.configure({
  appenders: {
    console: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '%[[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p] [%c]%] %m',
      },
    },
    file: {
      type: 'dateFile',
      filename: path.join(LOG_DIR, 'app.log'),
      pattern: 'yyyy-MM-dd',
      alwaysIncludePattern: true,
      daysToKeep: 30,
      encoding: 'utf-8',
      layout: {
        type: 'pattern',
        pattern: '[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p] [%c] %m',
      },
    },
    error: {
      type: 'dateFile',
      filename: path.join(LOG_DIR, 'error.log'),
      pattern: 'yyyy-MM-dd',
      alwaysIncludePattern: true,
      daysToKeep: 30,
      encoding: 'utf-8',
      layout: {
        type: 'pattern',
        pattern: '[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p] [%c] %m',
      },
    },
    request: {
      type: 'dateFile',
      filename: path.join(LOG_DIR, 'request.log'),
      pattern: 'yyyy-MM-dd',
      alwaysIncludePattern: true,
      daysToKeep: 30,
      encoding: 'utf-8',
      layout: {
        type: 'pattern',
        pattern: '%m',
      },
    },
  },
  categories: {
    default: {
      appenders: ['console', 'file'],
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    error: {
      appenders: ['console', 'error'],
      level: 'error',
    },
    request: {
      appenders: ['console', 'request'],
      level: 'info',
    },
  },
});

export const logger = log4js.getLogger();
export const errorLogger = log4js.getLogger('error');
export const requestLogger = log4js.getLogger('request');

/**
 * Express middleware that logs every incoming northbound request.
 * Records method, path, status code, and response duration.
 */
export function requestLoggingMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    requestLogger.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      }),
    );

    if (res.statusCode >= 400) {
      errorLogger.warn(
        `[Request] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
      );
    }
  });

  next();
}
