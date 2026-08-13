import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// В dev Next.js пересобирает модули при каждом HMR-обновлении — без кэширования
// в globalThis каждый reload создавал бы новое соединение с БД.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
