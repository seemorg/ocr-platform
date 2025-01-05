import { env } from "@/env";
import { Pool, PoolConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@usul-ocr/db";
import { PrismaClient as UsulDbClient } from "@usul-ocr/usul-db";

const createAdapter = (connectionString: string): PrismaNeon | null => {
  const poolConfig: PoolConfig = { connectionString };

  return env.PRISMA_ADAPTER === "neon"
    ? new PrismaNeon(new Pool(poolConfig))
    : null;
};

const createPrismaClient = () => {
  const adapter = createAdapter(env.DATABASE_URL);

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
  const adapter = createAdapter(env.USUL_DATABASE_URL);

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
