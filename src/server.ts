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

import { Server } from 'http';
import { Http2SecureServer } from 'http2';

export const startServer = async (): Promise<Server | Http2SecureServer> => {
  const app = startApp().callback();
  const server = http2Enabled
    ? (await import('http2')).createSecureServer(options, app)
    : (await import('http')).createServer(app);

  server.listen({
    port: PORT,
    host: HOSTNAME,
  });
  return server;
};

export const serverSite = `${httpProtocol}://${HOSTNAME}:${PORT}`;
export default startServer;
