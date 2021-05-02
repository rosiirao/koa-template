# koa-template

A template for koa project with http2, logger, and router.

## configuration

The project use [node-config](https://github.com/lorenwest/node-config) to organizes configurations.

Copy _config.json.template_ file to the _config_ directory, and rename it to _.json_ format. Modify its content to enable or disable http2.

## default routes

- `/api`: the service for kube controller: healthz, readyz, version
- `/file`: the static files service. Set the *public* and *root* path in *config.json*
- `/auth`: for auth example.

## development and test

Use _.env_ to set development environment variable.

Run `npm test` to test project.
