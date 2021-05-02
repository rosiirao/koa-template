import Router from '@koa/router';
// import package from '../../package';

// import { version as ver, name } from '../../package.json';
const ver = 'v1';
const name = 'koa-template';

// const pkg: { name: string; version: string } = require('../../package');

let healthStatus = true,
  readyStatus = true;

/**
 * Is service live
 * @param ctx
 * @param next
 */
export const healthz: Router.Middleware = async function (ctx) {
  let available = 200,
    message;

  ctx.type = 'text/plain';
  if (healthStatus) {
    message = `Service is live`;
    available = 200;
  } else {
    message = `Service is broken`;
    available = 503;
  }
  ctx.status = available;
  ctx.body = message;
  return;
};

/**
 * Is ready service to new requests
 * @param ctx
 * @param next
 */
export const readyz: Router.Middleware = async function readyz(ctx) {
  let available = 200,
    message;

  ctx.type = 'text/plain';
  if (readyStatus) {
    message = `Service is ready to new requests`;
    available = 200;
  } else {
    message = `Service Temporary Unavailable`;
    available = 503;
  }
  ctx.status = available;
  ctx.body = message;
  return;
};

/**
 * Set health status
 * @param {boolean} status
 */
export function setHealth(status = true): void {
  healthStatus = status;
}

/**
 * Set ready status
 * @param {boolean} status
 */
export function setReady(status = true): void {
  readyStatus = status;
}

/**
 * Get version of app
 */
export const version: Router.Middleware = async function version(ctx) {
  ctx.body = {
    name: name,
    version: ver,
  };
  return;
};
