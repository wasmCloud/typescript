import { Hono } from "hono";
import { showRoutes } from "hono/dev";
import { logger } from "hono/logger";
// import { fire } from "hono/service-worker";
import { fire, buildLogger } from '@bytecodealliance/jco-std/wasi/0.2.3/http/adapters/hono/server';


import { setupRoutes } from "./routes";

const server = new Hono();

server.use(logger(buildLogger()));

setupRoutes(server);

// showRoutes() logs all the routes available,
// but this line only runs once during component build, due
// to component optimization intricacies (wizer)
showRoutes(server, {
    verbose: true,
});

// breaks without useFetchEvent. I don't know why.
fire(server, { useFetchEvent: true });

// export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.6/http/adapters/hono/server';
