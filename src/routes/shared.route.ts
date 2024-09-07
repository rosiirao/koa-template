import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library.js';
import createHttpError from 'http-errors';

export function prismaErrorHandler(e: unknown) {
  if (!(e instanceof PrismaClientKnownRequestError)) throw e;
  if (e.code === 'P2002') {
    throw createHttpError(
      422,
      `There is a conflict with one of other applications`
    );
  }
  if (e.code === 'P2025') {
    throw createHttpError(404);
  }
  throw e;
}
