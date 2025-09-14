import prisma from '../../../lib/prisma';

export async function GET() {
  const [users, wallets, ledgers, membershipPlans] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.count(),
    prisma.ledger.count(),
    prisma.membershipPlan.count()
  ]);
  return Response.json({
    ok: true,
    counts: { users, wallets, ledgers, membershipPlans }
  });
}
