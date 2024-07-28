import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/dist/src/queueAdapters/bullMQ.js";
import { HonoAdapter } from "@bull-board/hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { showRoutes } from "hono/dev";

import { booksQueue } from "./book-queue";
import { pagesQueue } from "./page-queue";

import "./book-worker";
import "./page-worker";

import { BookStatus } from "@usul-ocr/db";

import { env } from "./env";
import { db } from "./lib/db";

const app = new Hono();

const serverAdapter = new HonoAdapter(serveStatic);

createBullBoard({
  queues: [new BullMQAdapter(booksQueue), new BullMQAdapter(pagesQueue)],
  serverAdapter,
});

const basePath = "/ui";
serverAdapter.setBasePath(basePath);

app.use(
  "/ui/*",
  basicAuth({
    username: env.DASHBOARD_USERNAME,
    password: env.DASHBOARD_PASSWORD,
  }),
);
app.route(basePath, serverAdapter.registerPlugin());

app.post("/book/ocr", async (c) => {
  const body = await c.req.json<{ bookId: string }>();
  const bookId = body.bookId;
  if (!bookId) {
    return c.json({ ok: false, error: "Book ID is required" }, 400);
  }

  const book = await db.book.findUnique({
    where: {
      id: bookId,
    },
  });

  if (!book) {
    return c.json({ ok: false, error: "Book not found" }, 404);
  }

  if (book.status !== BookStatus.UNPROCESSED) {
    return c.json({ ok: false, error: "Book is already processed" }, 400);
  }

  await booksQueue.add(`${bookId}-ocr`, { bookId });

  return c.json({ ok: true });
});

const formatTime = (time: number) => {
  const seconds = Math.floor(time / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
};

let startDate: Date | null;

app.get("/uptime", async (c) => {
  const time = startDate ? new Date().getTime() - startDate.getTime() : 0;

  return c.json({ uptime: formatTime(time) });
});

showRoutes(app);

let port = 8080;
if (process.env.PORT) {
  const portInt = parseInt(process.env.PORT);
  if (portInt && !isNaN(portInt)) {
    port = portInt;
  }
}

serve({ fetch: app.fetch, port }, ({ address, port }) => {
  startDate = new Date();
  console.log(`Server started on ${address}:${port}...`);
});
