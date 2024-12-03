import { env } from "@/env";
import { getPdfPageAsImage } from "@/lib/ocr";
import { pagesQueue } from "@/page-queue";
import { getBookPdfUrl } from "@/services/book";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cache } from "hono/cache";
import { stream } from "hono/streaming";
import { validator } from "hono/validator";
import { z } from "zod";

import { BookStatus, PageOcrStatus } from "@usul-ocr/db";

import { booksQueue } from "../book-queue";
import { db } from "../lib/db";

const ocrRoutes = new Hono();

ocrRoutes.post(
  "/book/ocr",
  bearerAuth({ token: env.OCR_SERVER_API_KEY }),
  async (c) => {
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
  },
);

const schema = z.object({
  bookId: z.string().min(1),
  pageNumber: z.coerce.number().min(1),
});

ocrRoutes.get(
  "/book/:bookId/:pageNumber",
  cache({
    cacheName: "page-image-cache",
    cacheControl: "max-age=86400, s-maxage=86400", // a day
  }),
  validator("param", (value, c) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return c.json({ ok: false, error: "Invalid request" }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const { bookId, pageNumber } = c.req.valid("param");

    const book = await getBookPdfUrl(bookId);
    if (!book) {
      return c.json({ ok: false, error: "Book not found" }, 404);
    }

    if (pageNumber > book.totalPages) {
      return c.json({ ok: false, error: "Page number is out of range" }, 400);
    }

    const pageImage = await getPdfPageAsImage(book.pdfUrl, pageNumber);
    if (!pageImage) {
      return c.json({ ok: false, error: "Failed to get page image" }, 500);
    }

    c.header("Content-Type", "image/png");
    c.header("Content-Length", pageImage.byteLength.toString());

    return stream(
      c,
      async (stream) => {
        await stream.write(pageImage);
      },
      async (err, stream) => {
        console.log(err);
        await stream.writeln("An error occurred!");
      },
    );
  },
);

// route for redoing OCR for a certain page
ocrRoutes.post(
  "/page/:pageId/ocr",
  validator("param", (value, c) => {
    const parsed = z
      .object({
        pageId: z.string().min(1),
      })
      .safeParse(value);
    if (!parsed.success) {
      return c.json({ ok: false, error: "Invalid request" }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const { pageId } = c.req.valid("param");

    const page = await db.page.findUnique({
      where: {
        id: pageId,
      },
      select: {
        id: true,
        pdfPageNumber: true,
        reviewed: true,
        book: {
          select: {
            id: true,
            pdfUrl: true,
            status: true,
          },
        },
      },
    });

    if (!page) {
      return c.json({ ok: false, error: "Page not found" }, 404);
    }

    const pageIndex = page.pdfPageNumber - 1;

    await db.page.update({
      where: {
        id: pageId,
      },
      data: {
        ocrStatus: PageOcrStatus.PROCESSING,
        flags: [],
        reviewed: false,
        reviewedAt: null,
        reviewedBy: { disconnect: true },
        ocrContent: "",
        ocrFootnotes: null,
        content: null,
        footnotes: null,
        ...(page.reviewed
          ? {
              book: {
                update: {
                  reviewedPages: {
                    decrement: 1,
                  },
                  ...(page.book.status === BookStatus.COMPLETED
                    ? {
                        status: BookStatus.IN_REVIEW,
                      }
                    : {}),
                },
              },
            }
          : {}),
      },
    });

    await pagesQueue.add(
      `${page.book.id}-page-${pageIndex}`,
      {
        pageId,
        bookId: page.book.id,
        pdfUrl: page.book.pdfUrl,
        pageIndex,
        isRedo: true,
      },
      {
        // prioritize redo jobs
        lifo: true,
      },
    );

    return c.json({ ok: true });
  },
);

export default ocrRoutes;
