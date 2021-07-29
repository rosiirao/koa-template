import Router from '@koa/router';
import 'koa-body';

import config from 'config';

type Conf = {
  PUBLIC_KEY?: string;
  PRIVATE_KEY?: string;
};

const { PUBLIC_KEY, PRIVATE_KEY }: Conf = config.has('services.auth')
  ? config.get('services.auth')
  : undefined;

import createHttpError from 'http-errors';
import { corsHeaders } from './cors';
import fs from 'fs';
import crypto from 'crypto';

import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const importMeta = require('./helper.mjs');

const jwt_exp_timeout = 3_600_000; // 2h
const refresh_token_exp_timeout = 108_000_000; // 30
const refresh_token_path = '/auth/refresh_token'; // 30

const privateKey = PRIVATE_KEY
  ? crypto.createPrivateKey(fs.readFileSync(PRIVATE_KEY))
  : undefined;
const publicKey = PUBLIC_KEY
  ? crypto.createPublicKey(fs.readFileSync(PUBLIC_KEY))
  : undefined;

import { create, prisma } from '../query/user';

export const register: Router.Middleware = async (ctx): Promise<void> => {
  const user = ctx.request.body;
  ctx.body = await create(user).finally(async () => {
    await prisma.$disconnect();
  });
  ctx.type = '.json';
  // return next();
};

const loginService = async function (username = '', password = '') {
  if (privateKey === undefined) {
    throw createHttpError(500, new Error('Private key not found!'));
  }
  if (username === '' || password === '') {
    throw createHttpError(401, 'Invalid Credentials');
  }
  const token = await new SignJWT({
    'urn:notacup:claim': true,
    name: username,
  })
    .setProtectedHeader({ alg: 'RS512' })
    .setSubject(username)
    .setIssuedAt()
    .setIssuer('urn:notacup:dev')
    .setAudience('urn:notacup:any')
    .setExpirationTime('1h')
    .sign(privateKey);

  return token;
};

/**
 * Send Authorization token and redirect if login success, otherwise do nothing.
 * @param ctx
 */
export const login: Router.Middleware = async function (ctx) {
  const { username, password /* redirectTo */ } = ctx.request.body;
  const jwt = await loginService(username, password);
  const token = await loginService(username, password);

  ctx.set({
    'Access-Control-Allow-Credentials': 'true',
  });
  ctx.cookies.set('refresh_token', token, {
    httpOnly: true,
    path: refresh_token_path,
    expires: new Date(refresh_token_exp_timeout + Date.now()),
  });
  ctx.type = 'application/json; charset=utf-8';
  ctx.body = {
    jwt_token: jwt,
    jwt_token_exp: new Date(jwt_exp_timeout + Date.now()),
  };
  // ctx.cookies.set('token', token, {
  //   httpOnly: true,
  //   expires: new Date(exp_timeout + Date.now()),
  // });
  // ctx.redirect(redirectTo || '/');
  // ctx.status = 302;
};

export const verifyAuthToken: Router.Middleware = async function (ctx, next) {
  if (publicKey === undefined) {
    throw createHttpError(500, new Error('Public key not found!'), {
      headers: corsHeaders(ctx),
    });
  }
  const auth = ctx.get('Authorization');
  let token: string = auth.startsWith('Bearer ')
    ? auth.substring(7)
    : undefined;

  const tokenKey = 'access_token';
  token = token ?? ctx.query[tokenKey] ?? ctx.request?.body?.[tokenKey] ?? '';

  if (token === '') {
    throw createHttpError(401, 'Unauthorized', {
      headers: corsHeaders(ctx),
    });
  }

  const {
    payload: { name, sub },
    // protectedHeader,
  } = await jwtVerify(token, publicKey, {
    algorithms: ['RS512'],
    maxTokenAge: '1h',
  }).catch((err) => {
    throw createHttpError(403, err, {
      headers: {
        'WWW-Authenticate': 'Bearer',
        ...corsHeaders(ctx),
      },
    });
  });
  ctx.state = { ...ctx.state, id: sub, name };

  return next();
};
