import { PrismaClient } from "./generated/prisma/index.js";

//proper logging 
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export const client = prisma;

export * from "./generated/prisma/index.js";