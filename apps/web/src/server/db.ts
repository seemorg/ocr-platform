import { env } from "@/env";
import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@usul-ocr/db";
import { PrismaClient as UsulDbClient } from "@usul-ocr/usul-db";

const createPrismaClient = () => {
  let adapter: PrismaNeon | null = null;
  if (typeof WebSocket !== "undefined") {
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    adapter = new PrismaNeon(pool);
  }

  return new PrismaClient({
    ...(adapter
      ? { adapter }
      : ({
          datasourceUrl: env.DATABASE_URL,
        } as any)),
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

const createUsulDbClient = () => {
  let adapter: PrismaNeon | null = null;
  if (typeof WebSocket !== "undefined") {
    const pool = new Pool({ connectionString: env.USUL_DATABASE_URL });
    adapter = new PrismaNeon(pool);
  }

  return new UsulDbClient({
    ...(adapter
      ? { adapter }
      : ({
          datasourceUrl: env.USUL_DATABASE_URL,
        } as any)),
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  usulDb: ReturnType<typeof createUsulDbClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();
export const usulDb = globalForPrisma.usulDb ?? createUsulDbClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.usulDb = usulDb;
}
