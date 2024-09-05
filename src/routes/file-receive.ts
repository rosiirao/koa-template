import Router from '@koa/router';
import compose from 'koa-compose';
import body from 'koa-body';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type Koa from 'koa';

const router = new Router({
  prefix: '/api',
});

const p = path.join(os.tmpdir(), 'com.notacup.koatpl');
const root_temp_dir = mkdirIfNoExist(p);

async function mkdirIfNoExist(p: string) {
  try {
    await fs.stat(p);
  } catch {
    await fs.mkdir(p);
  }
  return p;
}

/**
 * Is ready service to new requests
 * @param ctx
 * @param next
 */
export const upload: Router.Middleware = async function (
  ctx: Koa.DefaultContext
) {
  const { category = '' } = ctx.request.body;
  const files = ctx.request.files;
  const dir = await (category.trim()
    ? mkdirIfNoExist(path.join(await root_temp_dir, category.trim()))
    : root_temp_dir);

  const filePath = (fileName: string) => path.join(dir, fileName);
  for (const field of Object.keys(files)) {
    const file = files[field];
    if (!Array.isArray(file)) {
      await fs.copyFile(file.path, filePath(file.name));
      fs.rm(file.path);
      continue;
    }
    for (const f of file) {
      await fs.copyFile(f.path, filePath(f.name));
      fs.rm(f.path);
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
