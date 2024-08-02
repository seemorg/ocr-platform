import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

import { bookRouter } from "./routers/book";
import { groupRouter } from "./routers/group";
import { whitelistRouter } from "./routers/whitelist";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  book: bookRouter,
  whitelist: whitelistRouter,
  group: groupRouter,
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
