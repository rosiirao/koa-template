import Router, { RouterContext } from '@koa/router';
import 'koa-body';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';

import config from 'config';

const saltRounds = 8;
// const myPlaintextPassword = 's0//P4$$w0rD';
// const someOtherPlaintextPassword = 'not_bacon';

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
};

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

const jwt_exp_timeout = 15 * 60_000; // 15m
const refresh_token_length = 60; // must be equal to the length of userAuth model
const refresh_token_exp_timeout = 108_000_000; // 30
const refresh_token_path = '/auth/refresh_token'; // 30

const privateKey = PRIVATE_KEY
  ? crypto.createPrivateKey(fs.readFileSync(PRIVATE_KEY))
  : undefined;
const publicKey = PUBLIC_KEY
  ? crypto.createPublicKey(fs.readFileSync(PUBLIC_KEY))
  : undefined;

import {
  create,
  findCredential,
  findOne,
  findUserCredential,
  prisma,
  updateUserCredential,
} from '../query/user.query';

export const register: Router.Middleware = async (ctx): Promise<void> => {
  const { password, ...rest } = ctx.request.body;
  ctx.body = await create({
    password: await hashPassword(password),
    ...rest,
  }).finally(async () => {
    await prisma.$disconnect();
  });
  ctx.type = '.json';
  // return next();
};

const findUser = async (username = '', password = '') => {
  if (username === '' || password === '') {
    throw createHttpError(401, 'Invalid Credentials');
  }
  const user = await findUserCredential({ email: username });
  if (
    user === null ||
    !(await bcrypt.compare(password, user.credential.password))
  ) {
    throw createHttpError(401, 'Invalid Credentials');
  }
  return user;
};

const createJWT = async function (username: string, id: string) {
  if (privateKey === undefined) {
    throw createHttpError(500, new Error('Private key not found!'));
  }
  const token = await new SignJWT({
    'urn:notacup:claim': true,
    name: username,
  })
    .setProtectedHeader({ alg: 'RS512' })
    .setSubject(id)
    .setIssuedAt()
    .setIssuer('urn:notacup:dev')
    .setAudience('urn:notacup:any')
    .setExpirationTime('1h')
    .sign(privateKey);

  return token;
};

const auth = async (
  ctx: RouterContext,
  user: { id: number; name?: string }
) => {
  const { id } = user;
  let { name } = user;
  if (name === undefined) {
    name = await findOne({ id }).then(({ name }) => name);
  }
  ctx.type = 'application/json; charset=utf-8';
  ctx.body = {
    jwt_token: await createJWT(name, String(id)),
    jwt_token_exp: new Date(jwt_exp_timeout + Date.now()),
  };
};

/**
 * Send Authorization token and redirect if login success, otherwise do nothing.
 * @param ctx
 */
export const login: Router.Middleware = async function (ctx) {
  const { username, password /* redirectTo */ } = ctx.request.body;
  const { id } = await findUser(username, password);

  const refresh_token = nanoid(refresh_token_length);
  const refresh_token_exp = new Date(refresh_token_exp_timeout + Date.now());

  /**
   * don't need wait updating refresh token finished
   */
  updateUserCredential(id, {
    refreshToken: refresh_token,
    refreshTokenExp: refresh_token_exp,
  });

  ctx.set({
    'Access-Control-Allow-Credentials': 'true',
  });
  ctx.cookies.set('refresh_token', refresh_token, {
    httpOnly: true,
    path: refresh_token_path,
    expires: refresh_token_exp,
    sameSite: 'none',
  });
  await auth(ctx, { id, name: username });
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
  ctx.state = { ...ctx.state, user: { id: sub, name } };

  return next();
};

export const refreshToken: Router.Middleware<IUserState> = async (ctx) => {
  const token = ctx.cookies.get('refresh_token');
  if (token === undefined) ctx.throw(401);
  const credential = await findCredential({ refreshToken: token });
  if (credential === null) ctx.throw(401);
  if (credential.refreshTokenExp < new Date()) {
    ctx.throw(401, 'Expired token');
  }
  await auth(ctx, { id: credential.userId });
};

import { clusterCache } from '../cache';
import { IUserState } from '../app';

const challenge_ttl = 10 * 60_000;
const challengeCacheKey = (userId: IUserState['user']['id']) =>
  `auth/change_password/challenge/${userId}`;

export const changePasswordAuth: Router.Middleware<IUserState> = (ctx) => {
  const challengeCode = nanoid(64);

  clusterCache.set(
    challengeCacheKey(ctx.state.user.id),
    challengeCode,
    challenge_ttl
  );
  ctx.body = challengeCode;
};

export const changePassword: Router.Middleware<IUserState> = async (ctx) => {
  const challengeCode = await clusterCache.get(
    challengeCacheKey(ctx.state.user.id)
  );
  ctx.body = process.pid + ' - ' + challengeCode;
};
