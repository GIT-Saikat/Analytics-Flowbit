import { PrismaClient } from "@prisma/client";

// Export configured Prisma client with proper logging
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Re-export all Prisma types
export * from "@prisma/client";