import startApp from './app.js';
import fs from 'fs';
import util from 'util';

import config from 'config';
const appConf:
  | {
      HTTP2_SERVER?: boolean;
      HTTP2_HOST?: string;
      HTTP2_PORT?: number;
      HTTP2_ALLOW_HTTP1?: boolean;
      HTTP_HOST?: string;
      HTTP_PORT?: number;
      CA?: string | string[];
      CERT_FILE?: string;
      CERT_KEY_FILE?: string;
    }
  | undefined = config.has('server') ? config.get('server') : undefined;

if (appConf === undefined) {
  throw new Error('Missing server configuration');
}

const readFileAsync = util.promisify(fs.readFile);
const http2Enabled = appConf.HTTP2_SERVER;
const options = (async () =>
  http2Enabled
    ? {
        cert: await readFileAsync(appConf.CERT_FILE!),
        key: await readFileAsync(appConf.CERT_KEY_FILE!),
        allowHTTP1: appConf.HTTP2_ALLOW_HTTP1 ?? false,
        ...(appConf.CA
          ? {
              ca: await Promise.all(
                ([] as string[])
                  .concat(appConf.CA)
                  .map((path) => readFileAsync(path))
              ),
            }
          : undefined),
      }
    : {})();

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
    ? (await import('http2')).createSecureServer(await options, app)
    : (await import('http')).createServer(app);

  server.listen({
    port: PORT,
    host: HOSTNAME,
  });
  return server;
};

export const serverSite = `${httpProtocol}://${HOSTNAME}:${PORT}`;
export default startServer;
