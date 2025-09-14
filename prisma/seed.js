import prisma from '../lib/prisma.js';

async function main() {
  const plans = [
    {
      code: 'BASE',
      name: 'BASE',
      description: 'Commissioni Digital 10% / Experiences 5%',
      price: 6000
    },
    {
      code: 'ACCESS',
      name: 'ACCESS',
      description: 'Boost x2 commissioni digital',
      price: 12000
    },
    {
      code: 'PRO',
      name: 'PRO',
      description: 'Academy avanzata + vantaggi extra',
      price: 29900
    }
  ];

  for (const plan of plans) {
    await prisma.membershipPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan
    });
  }
}

main()
  .then(() => {
    console.log('Seed completato');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
