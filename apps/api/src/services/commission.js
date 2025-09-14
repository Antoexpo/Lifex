/**
 * Calculate and create generational commissions for a subscription payment.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} payerId - user who paid subscription
 * @param {number} amount - commissionable amount
 * @param {any} config - compensation plan config
 * @returns {Promise<Array>} created commissions
 */
export async function calculateCommissions(prisma, payerId, amount, config) {
  const payer = await prisma.user.findUnique({ where: { id: payerId } });
  if (!payer) throw new Error('payer not found');
  const ancestorIds = payer.path
    .split('/')
    .filter(Boolean)
    .map(id => parseInt(id, 10))
    .reverse()
    .slice(0, 7);
  const created = [];
  let level = 1;
  for (const ancestorId of ancestorIds) {
    const sponsor = await prisma.user.findUnique({
      where: { id: ancestorId },
      include: {
        subscription: true,
        directSponsorships: {
          where: { subscription: { status: 'ACTIVE' } }
        }
      }
    });
    if (!sponsor || sponsor.subscription?.status !== 'ACTIVE') {
      level++;
      continue;
    }
    const activeDirects = sponsor.directSponsorships.length;
    if (activeDirects < config.min_directs_for_commission) {
      level++;
      continue;
    }
    const rate = config.generational_commissions[level - 1] || 0;
    if (rate <= 0) {
      level++;
      continue;
    }
    const commissionAmount = amount * rate;
    const commission = await prisma.commission.create({
      data: {
        userId: sponsor.id,
        sourceId: payerId,
        level,
        amount: commissionAmount
      }
    });
    await prisma.wallet.update({
      where: { userId: sponsor.id },
      data: {
        balance: { increment: commissionAmount },
        transactions: {
          create: {
            amount: commissionAmount,
            type: 'COMMISSION',
            description: `Commission L${level} from ${payerId}`
          }
        }
      }
    });
    created.push(commission);
    level++;
  }
  return created;
}
