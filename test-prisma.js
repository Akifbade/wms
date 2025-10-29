const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('Prisma available models:', Object.keys(prisma).filter(k => typeof prisma[k] === 'object' && prisma[k]?.findMany));
