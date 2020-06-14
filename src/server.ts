import startApp from './app';
import fs from 'fs';

import config from 'config';
const appConf: {
  HTTP2_SERVER?: boolean;
  HTTP2_HOST?: string;
  HTTP2_PORT?: number;
  HTTP2_ALLOW_HTTP1?: boolean;
  HTTP_HOST?: string;
  HTTP_PORT?: number;
  CERT_FILE?: string;
  CERT_KEY_FILE?: string;
} = config.has('server') && config.get('server');

const http2Enabled = appConf.HTTP2_SERVER;
const options = http2Enabled
  ? {
      cert: fs.readFileSync(appConf.CERT_FILE),
      key: fs.readFileSync(appConf.CERT_KEY_FILE),
      allowHTTP1: appConf.HTTP2_ALLOW_HTTP1 ?? false,
    }
  : {};

const PORT = http2Enabled
  ? appConf?.HTTP2_PORT ?? 3443
  : appConf?.HTTP_PORT ?? 8080;
const HOSTNAME =
  (http2Enabled ? appConf?.HTTP2_HOST : appConf?.HTTP_HOST) ?? 'localhost';
const httpProtocol = http2Enabled ? 'https' : 'http';

const httpModule = import(http2Enabled ? 'http2' : 'http');

import { Server } from 'http';
export const startServer = (): Promise<Server> => {
  const app = startApp();
  const server: Promise<Server> = httpModule
    .then((http_) =>
      http2Enabled
        ? http_.createSecureServer(options, app.callback())
        : http_.createServer(app.callback())
    )
    .then((server) => {
      server.listen({
        port: PORT,
        host: HOSTNAME,
      });
      return server;
    });
  return server;
};

export const serverSite = `${httpProtocol}://${HOSTNAME}:${PORT}`;
export default startServer;
