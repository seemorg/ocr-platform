import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

import { airtableRouter } from "./routers/airtable";
import { authorsRouter } from "./routers/author";
import { bookRouter } from "./routers/book";
import { groupRouter } from "./routers/group";
import { openaiRouter } from "./routers/openai";
import { pageRouter } from "./routers/page";
import { uploadsRouter } from "./routers/upload";
import { usersRouter } from "./routers/user";
// usul
import { usulAdvancedGenreRouter } from "./routers/usul/advancedGenre";
import { usulAuthorRouter } from "./routers/usul/author";
import { usulBookRouter } from "./routers/usul/book";
import { usulGenreRouter } from "./routers/usul/genre";
import { cacheRouter } from "./routers/cache";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  airtable: airtableRouter,
  book: bookRouter,
  group: groupRouter,
  user: usersRouter,
  author: authorsRouter,
  upload: uploadsRouter,
  page: pageRouter,
  openai: openaiRouter,
  // usul
  usulBook: usulBookRouter,
  usulGenre: usulGenreRouter,
  usulAdvancedGenre: usulAdvancedGenreRouter,
  usulAuthor: usulAuthorRouter,
  cache: cacheRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
