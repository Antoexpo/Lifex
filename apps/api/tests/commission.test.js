import { describe, it, expect } from 'vitest';
import { calculateCommissions } from '../src/services/commission.js';

function createPrismaMock() {
  const db = {
    users: {},
    commissions: [],
    wallets: {}
  };
  return {
    db,
    user: {
      findUnique: async ({ where: { id }, include }) => {
        const u = db.users[id];
        if (!u) return null;
        if (!include) return u;
        const result = { ...u };
        if (include.subscription) result.subscription = u.subscription;
        if (include.directSponsorships) {
          const directs = (u.directSponsorships || []).map(did => db.users[did]);
          result.directSponsorships = directs.filter(d => d.subscription.status === 'ACTIVE');
        }
        return result;
      }
    },
    commission: {
      create: async ({ data }) => {
        const id = db.commissions.length + 1;
        const record = { id, ...data };
        db.commissions.push(record);
        return record;
      }
    },
    wallet: {
      update: async ({ where: { userId }, data }) => {
        const w = db.wallets[userId];
        w.balance += data.balance.increment;
        w.transactions.push({ ...data.transactions.create });
        return w;
      }
    }
  };
}

describe('calculateCommissions', () => {
  it('distributes commissions to active ancestors', async () => {
    const prisma = createPrismaMock();
    prisma.db.users = {
      1: { id: 1, path: '/', subscription: { status: 'ACTIVE' }, directSponsorships: [2,3] },
      2: { id: 2, path: '/1/', subscription: { status: 'ACTIVE' }, directSponsorships: [4] },
      3: { id: 3, path: '/1/2/', subscription: { status: 'ACTIVE' }, directSponsorships: [] },
      4: { id: 4, path: '/1/2/3/', subscription: { status: 'ACTIVE' }, directSponsorships: [] }
    };
    prisma.db.wallets = {
      1: { balance: 0, transactions: [] },
      2: { balance: 0, transactions: [] },
      3: { balance: 0, transactions: [] }
    };
    const config = { generational_commissions: [0.1, 0.05, 0.02], min_directs_for_commission: 0 };
    const created = await calculateCommissions(prisma, 4, 30, config);
    expect(created.length).toBe(3);
    expect(prisma.db.wallets[1].balance).toBeCloseTo(0.6); // level3
    expect(prisma.db.wallets[2].balance).toBeCloseTo(1.5); // level2
    expect(prisma.db.wallets[3].balance).toBeCloseTo(3);   // level1
  });

  it('skips inactive or ineligible ancestors', async () => {
    const prisma = createPrismaMock();
    prisma.db.users = {
      1: { id: 1, path: '/', subscription: { status: 'ACTIVE' }, directSponsorships: [2,3] },
      2: { id: 2, path: '/1/', subscription: { status: 'PENDING' }, directSponsorships: [4] },
      3: { id: 3, path: '/1/2/', subscription: { status: 'ACTIVE' }, directSponsorships: [] },
      4: { id: 4, path: '/1/2/3/', subscription: { status: 'ACTIVE' }, directSponsorships: [] }
    };
    prisma.db.wallets = {
      1: { balance: 0, transactions: [] },
      2: { balance: 0, transactions: [] },
      3: { balance: 0, transactions: [] }
    };
    const config = { generational_commissions: [0.1, 0.05, 0], min_directs_for_commission: 1 };
    const created = await calculateCommissions(prisma, 4, 30, config);
    expect(created.length).toBe(0); // none qualifies
    expect(prisma.db.wallets[1].balance).toBe(0);
    expect(prisma.db.wallets[2].balance).toBe(0);
    expect(prisma.db.wallets[3].balance).toBe(0);
  });
});
