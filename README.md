# koa-template

A template for koa project with http2, logger, and router.

## development and test

Use _.env_ to set development environment variable.

Run `npm test` to test project.

### debug

Set below options to make [debug work in VS Code](https://code.visualstudio.com/docs/typescript/typescript-debugging):

1. make *sourceMap* to be truth in the ts compile options
2. set *program* property to be the entry file(*${workspaceFolder}/src/main.ts*) in debug configuration

## configuration

The project use [node-config](https://github.com/lorenwest/node-config) to organizes configurations.

Copy _config.json.template_ file to the _config_ directory, and rename it to _.json_ format. Modify its content to enable or disable http2.

Set *services.files* in configuration to supply the static files service

## default routes

- `/api`: the service for kube controller: healthz, readyz, version
    - `/api/upload`: upload files to the indicated category(submitted field in the same form)
- `/file`: the static files service. Set the *public* and *root* path in *config.json*
- `/auth`: for auth example

## koa knowledge

### ctx.throw

If pass the error argument, then the error will be printed to stderr, if only pass error number argument, only print the status information as error.

Set `err.expose=true` to expose error detail to client
