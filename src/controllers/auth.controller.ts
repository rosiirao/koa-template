import Router, { RouterContext } from '@koa/router';
import 'koa-body';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import type Koa from 'koa';

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
  JWT_URN?: string;
};

const { PUBLIC_KEY, PRIVATE_KEY, JWT_URN }: Conf = config.has('services.auth')
  ? config.get('services.auth')
  : {};
const JWT_URN_PREFIX = JWT_URN ? `${JWT_URN}:` : '';

import createHttpError from 'http-errors';
import { corsHeaders } from './cors.js';
import fs from 'fs';
import crypto from 'crypto';

import { SignJWT } from 'jose';
import { jwtVerify } from 'jose';

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
  findUnique,
  findUserCredential,
  updateUserCredential,
} from '../query/user.query.js';

export const register: Router.Middleware = async (
  ctx: Koa.DefaultContext
): Promise<void> => {
  const { password, ...rest } = ctx.request.body;
  ctx.body = await create({
    password: await hashPassword(password),
    ...rest,
  });
  ctx.type = '.json';
};

const findUser = async (username = '', password = '') => {
  if (username === '' || password === '') {
    throw createHttpError(401, 'Invalid Credentials');
  }
  const user = await findUserCredential({ email: username });
  if (
    user?.credential?.password === undefined ||
    !(await bcrypt.compare(password, user.credential.password))
  ) {
    throw createHttpError(401, 'Invalid Credentials');
  }
  return user!;
};

const createJWT = async function (username: string, id: string) {
  if (privateKey === undefined) {
    throw createHttpError(500, new Error('Private key not found!'));
  }
  const token = await new SignJWT({
    [`${JWT_URN_PREFIX}claim`]: true,
    name: username,
  })
    .setProtectedHeader({ alg: 'RS512' })
    .setSubject(id)
    .setIssuedAt()
    .setIssuer(`${JWT_URN_PREFIX}dev`)
    .setAudience(`${JWT_URN_PREFIX}any`)
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
    name = (await findUnique({ id }))?.name ?? undefined;
  }
  if (name === undefined) {
    throw createHttpError(401, 'User name is not effective');
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
export const login: Router.Middleware = async function (
  ctx
) {
  const { username, password /* redirectTo */ } = ctx.request.body;
  const { id } = await findUser(username, password);

  const refresh_token = nanoid(refresh_token_length);
  const refresh_token_exp = new Date(refresh_token_exp_timeout + Date.now());

  /**
   * don't need wait updating refresh token finished
   */
  updateUserCredential(id!, {
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
  await auth(ctx, { id: id!, name: username });
};

export const verifyAuthToken: Router.Middleware<IUserState> = async function (
  ctx,
  next: Koa.Next
) {
  if (publicKey === undefined) {
    throw createHttpError(500, new Error('Public key not found!'), {
      headers: corsHeaders(ctx),
    });
  }
  const auth = ctx.get('Authorization');
  let token = auth.startsWith('Bearer ') ? auth.substring(7) : undefined;

  const tokenKey = 'access_token';
  token = token ?? ctx.query[tokenKey] ?? ctx.request?.body?.[tokenKey];

  if (token === '' || token === undefined) {
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
  if (sub === undefined || !isFinite(Number(sub))) {
    throw createHttpError(401, 'Invalid token');
  }
  ctx.state = { ...ctx.state, user: { id: Number(sub), name: name as string } };

  return next();
};

export const refreshToken: Router.Middleware<IUserState> = async (
  ctx
) => {
  const token = ctx.cookies.get('refresh_token');
  if (token === undefined) throw createHttpError(401);
  const credential = await findCredential({ refreshToken: token });
  if ((credential?.refreshTokenExp ?? undefined) === undefined)
    throw createHttpError(401);
  if (credential!.refreshTokenExp! < new Date()) {
    ctx.throw(401, 'Expired token');
  }
  await auth(ctx, { id: credential!.userId });
};

import { clusterCache } from '../cache/index.js';
import { IUserState } from '../app.js';
import compose from 'koa-compose';

const challenge_ttl = 10 * 60_000;
const challengeCacheKey = (username: IUserState['user']['name']) =>
  `auth/change_password/challenge/${username}`;

export const changePasswordAuth: Router.Middleware<IUserState> = async (
  ctx: Koa.DefaultContext
) => {
  if (privateKey === undefined) {
    throw createHttpError(500, new Error('Private key not found!'));
  }
  const challengeCode = nanoid(64);
  const { username } = ctx.request.body;
  const token = new SignJWT({
    [`${JWT_URN_PREFIX}claim`]: true,
    code: challengeCode,
  })
    .setSubject(username)
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKey);
  clusterCache.set(challengeCacheKey(username), challengeCode, challenge_ttl);
  ctx.type = 'text/plain';
  ctx.body = await token;
};

const verifyChangePassword: Router.Middleware<IUserState> = async (
  ctx: Koa.DefaultContext,
  next: Koa.Next
) => {
  const token = new URLSearchParams(ctx.querystring).get('code');
  const { password } = ctx.request.body ?? {};
  if (token !== null) {
    if (publicKey === undefined) {
      throw new Error('Public key not found');
    }
    const {
      payload: { code, sub },
    } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
    });
    if (typeof code !== 'string' || sub === undefined) {
      throw createHttpError(403, 'Operation invalid');
    }
    ctx.state.user = { name: sub };
    await verifyChallengeCode(sub, code);
    return next();
  }

  const user = await ctx.state.user;
  if (user !== undefined && password !== undefined) {
    if ((await findUser(user.name, password)) === undefined) {
      throw createHttpError(403, 'Password verify failed');
    }
    return next();
  }

  throw createHttpError(403, 'Operation invalid');
};

const changePassword: Router.Middleware<IUserState> = async (
  ctx: Koa.DefaultContext
) => {
  const { newPassword } = ctx.request.body;
  const { id, name } = ctx.state.user;
  if (id === undefined && name === undefined) {
    throw new Error('ctx.state.user.id must not be empty for change password');
  }
  await updateUserCredential(
    (id ?? { email: name }) as number | { email: string },
    {
      password: await hashPassword(newPassword),
    }
  );
  ctx.status = 204;
};

async function verifyChallengeCode(username: string, code: string) {
  const challengeCode = await clusterCache.take(challengeCacheKey(username));
  if (code !== challengeCode) {
    throw createHttpError(403, 'Operation invalid or operation expired');
  }
}

const changePasswordService = compose([verifyChangePassword, changePassword]);
export { changePasswordService as changePassword };
