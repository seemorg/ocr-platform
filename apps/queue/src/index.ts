import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/dist/src/queueAdapters/bullMQ.js";
import { HonoAdapter } from "@bull-board/hono";
import { Hono } from "hono";
import { showRoutes } from "hono/dev";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

import { booksQueue } from "./book-queue";
import { pagesQueue } from "./page-queue";

import "./book-worker";
import "./page-worker";
import { db } from "./lib/db";
import { BookStatus } from "@usul-ocr/db";

const app = new Hono();

const serverAdapter = new HonoAdapter(serveStatic);
// serverAdapter.setStaticPath("./public");

createBullBoard({
  queues: [new BullMQAdapter(booksQueue), new BullMQAdapter(pagesQueue)],
  serverAdapter,
});

const basePath = "/ui";
serverAdapter.setBasePath(basePath);
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

showRoutes(app);

let port = 8080;
if (process.env.PORT) {
  const portInt = parseInt(process.env.PORT);
  if (portInt && !isNaN(portInt)) {
    port = portInt;
  }
}

serve({ fetch: app.fetch, port }, ({ address, port }) => {
  console.log(`Server started on ${address}:${port}...`);
});
