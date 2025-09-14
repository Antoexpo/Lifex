import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  await prisma.commission.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();

  const adminPass = await argon2.hash('adminpass');
  const staffPass = await argon2.hash('staffpass');
  const memberPass = await argon2.hash('memberpass');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: adminPass,
      referralCode: 'ADMIN',
      path: '/',
      subscription: { create: { status: 'ACTIVE', expireAt: new Date(Date.now() + 30*86400000) } },
      wallet: { create: {} }
    }
  });

  await prisma.user.create({
    data: {
      email: 'staff@example.com',
      password: staffPass,
      referralCode: 'STAFF',
      path: '/',
      subscription: { create: { status: 'ACTIVE', expireAt: new Date(Date.now() + 30*86400000) } },
      wallet: { create: {} }
    }
  });

  await prisma.user.create({
    data: {
      email: 'member@example.com',
      password: memberPass,
      referralCode: 'MEMBER',
      sponsorId: admin.id,
      path: `/${admin.id}/`,
      subscription: { create: { status: 'ACTIVE', expireAt: new Date(Date.now() + 30*86400000) } },
      wallet: { create: {} }
    }
  });
}

main().finally(() => prisma.$disconnect());
