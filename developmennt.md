# Development

## Update prisma schema

- `npx prisma generate`
- `npx prisma db push`

## Prisma migrate

- In development environment
  - The first migrate: `npx prisma migrate dev --name init`
  - The second migrate: `npx prisma migrate dev --name added_job_title`
  - Generate and apply migrates : `npx prisma migrate dev`
  - Reset: `npx prisma migrate reset`
  - [Custom migrate](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate/customizing-migrations)
- Testing and production environment
  - `npx prisma migrate deploy`

## environment

- SQL_LOG_LEVEL
  - the comma separated log level array of prisma client: *query*, *info*, *warn*, *error*.

## issues

[The `jest.mock` does not mock an es module without babel](https://github.com/facebook/jest/issues/10025)
