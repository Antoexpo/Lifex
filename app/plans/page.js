async function getPlans() {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  const res = await fetch(`${base}/api/plans`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Errore caricamento piani');
  return res.json();
}

export default async function PlansPage() {
  const plans = await getPlans();
  return (
    <main>
      <h1>Piani</h1>
      <ul>
        {plans.map((plan) => (
          <li key={plan.id}>
            <strong>{plan.name}</strong> – €{(plan.price / 100).toFixed(2)}
            {plan.description ? ` — ${plan.description}` : ''}
          </li>
        ))}
      </ul>
    </main>
  );
}
