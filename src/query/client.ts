import { type Prisma, PrismaClient } from '@prisma/client';

const SQL_LOG_LEVEL = process.env.SQL_LOG_LEVEL;
type LOG_LEVEL = NonNullable<Prisma.PrismaClientOptions['log']>;
const prisma = new PrismaClient(
  SQL_LOG_LEVEL
    ? { log: SQL_LOG_LEVEL.split(/,\s*/gi) as LOG_LEVEL }
    : undefined
);

export default prisma;
