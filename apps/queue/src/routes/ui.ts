import { uploadQueue } from "@/upload-queue";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/dist/src/queueAdapters/bullMQ.js";
import { HonoAdapter } from "@bull-board/hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";

import { booksQueue } from "../book-queue";
import { env } from "../env";
import { pagesQueue } from "../page-queue";

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
