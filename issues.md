# Issues

## Koa routers

1. The subsequent routers doesn't work if there is any preceding match routes
2. There is no way to configure the options of *path-to-regex*
3. How to determine the resourceId
   1. the resourceId must be determined by the resource route
   2. the authorize middleware must be applied before the resource route determined

### To solved the routers

We have to sacrifice some readability to solve the router issues list upon

1. Use *authorizeRoute(router)* to resolve and authorize the application indicated in route path before accessing resources
2. The *resource* indicated in path is related to the application, there must be a reference *unityResource*
