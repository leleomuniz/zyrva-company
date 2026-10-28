import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { requiredEnv } from "@/lib/server/env";

const globalForPrisma = globalThis as typeof globalThis & { zyrvaPrisma?: PrismaClient };

export function prismaClient(): PrismaClient {
  if (globalForPrisma.zyrvaPrisma) return globalForPrisma.zyrvaPrisma;

  const adapter = new PrismaPg(requiredEnv("DATABASE_URL"));
  const client = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") globalForPrisma.zyrvaPrisma = client;
  return client;
}
