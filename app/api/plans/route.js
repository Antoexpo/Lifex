import prisma from '../../../lib/prisma';

export async function GET() {
  const plans = await prisma.membershipPlan.findMany({
    where: { active: true },
    orderBy: { price: 'asc' }
  });
  return Response.json(
    plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency
    }))
  );
}
