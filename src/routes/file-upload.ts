import Router from '@koa/router';
import compose from 'koa-compose';
import body from 'koa-body';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request } from 'koa';

import config from 'config';
import createHttpError from 'http-errors';


type Conf = {
  local_path?: string;
}

const conf: Conf | undefined = config.has('services.upload')
  ? config.get('services.upload')
  : undefined;

const router = new Router({
  prefix: '/api',
});

const p = !conf?.local_path ? undefined : path.resolve((conf.local_path.startsWith('/') ? '.' : '') + conf.local_path);
const root_temp_dir = p ? mkdirIfNoExist(p) : undefined;

async function mkdirIfNoExist(p: string) {
  try {
    await fs.stat(p);
  } catch {
    await fs.mkdir(p);
  }
  return p;
}

type Files = NonNullable<Request['files']>[0];
type E<T> = T extends (infer _)[] ? T[number] : T
type File = E<Files>

let alt_count = 0
function filenameOf(file: File, altname?: string): string {
  const date = new Date()
  const basename = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  return file.originalFilename ?? `${basename}--${altname}-${++alt_count}`;
}

/**
 * Is ready service to new requests
 * @param ctx
 * @param next
 */
export const upload: Router.Middleware = async function (ctx) {
  if (!root_temp_dir) throw createHttpError(503);
  const { category = '' } = ctx.request.body as Record<string, string>;
  const files = ctx.request.files;
  const dir = await (category.trim()
    ? mkdirIfNoExist(path.join(await root_temp_dir, category.trim()))
    : root_temp_dir);

  const filePath = (fileName: string) => path.join(dir, fileName);
  if (!files) return;
  for (const field of Object.keys(files)) {
    const file = files[field];
    if (!Array.isArray(file)) {
      await fs.copyFile(file.filepath, filePath(filenameOf(file, field)));
      fs.rm(file.filepath);
      continue;
    }
    for (const f of file) {
      await fs.copyFile(f.filepath, filePath(filenameOf(f, field)));
      fs.rm(f.filepath);
    }
  }

  ctx.type = 'text/plain';
  ctx.status = 201;
  ctx.body = 'upload success';
  return;
};
router.post(
  '/upload',
  body.koaBody({
    multipart: true,
  }),
  upload
);

export default compose([router.routes(), router.allowedMethods()]);
