import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

import { authorsRouter } from "./routers/author";
import { bookRouter } from "./routers/book";
import { groupRouter } from "./routers/group";
import { uploadsRouter } from "./routers/upload";
import { usersRouter } from "./routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  book: bookRouter,
  group: groupRouter,
  user: usersRouter,
  author: authorsRouter,
  upload: uploadsRouter,
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
