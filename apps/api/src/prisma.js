import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL || 'file:./dev.db';
export const prisma = new PrismaClient({ datasources: { db: { url } } });
