import { env } from "@/env";
import { booksQueue } from "@/queues/book/queue";
import { pagesQueue } from "@/queues/page/queue";
import { uploadQueue } from "@/queues/upload/queue";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/dist/src/queueAdapters/bullMQ.js";
import { HonoAdapter } from "@bull-board/hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";

const basePath = "/ui";
const uiRoutes = new Hono().basePath(basePath);

uiRoutes.use(
  basicAuth({
    username: env.DASHBOARD_USERNAME,
    password: env.DASHBOARD_PASSWORD,
  }),
);

const serverAdapter = new HonoAdapter(serveStatic).setBasePath(basePath);

createBullBoard({
  queues: [
    new BullMQAdapter(booksQueue),
    new BullMQAdapter(pagesQueue),
    new BullMQAdapter(uploadQueue),
  ],
  serverAdapter,
});

uiRoutes.route("/", serverAdapter.registerPlugin());

export default uiRoutes;
