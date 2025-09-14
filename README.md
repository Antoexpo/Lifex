# LIFEX

Progetto Next.js 14 con Prisma e PostgreSQL.

## Requisiti

- Node.js 18+
- Database PostgreSQL (Neon)

## Variabili d'ambiente

```
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
AUTH_SECRET=
```

## 1. Setup Database su Neon

1. Registrati su [https://neon.tech](https://neon.tech).
2. Crea un nuovo progetto (es. regione Francoforte).
3. Copia la connection string (es. `postgresql://.../neondb?sslmode=require`).
4. Crea un file `.env.local` con:
   
   ```env
   DATABASE_URL="postgresql://<utente>:<password>@<host>/<db>?sslmode=require"
   ```

## 2. Installazione e migrazioni locali

```bash
npm install
npm run prisma:deploy
node prisma/seed.js   # popola i 3 piani
npm run dev
```

Test locali:

- [http://localhost:3000/api/health](http://localhost:3000/api/health) → `{ ok: true }`
- [http://localhost:3000/api/plans](http://localhost:3000/api/plans) → JSON piani
- [http://localhost:3000/plans](http://localhost:3000/plans) → pagina piani

## 3. Deploy su Vercel

1. Importa la repo in Vercel.
2. Aggiungi `DATABASE_URL` in **Settings → Environment Variables**.
3. Deploy automatico.
4. Testa `/api/health`, `/api/plans`, `/plans`.

## 4. Placeholder variabili future

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
AUTH_SECRET=
```

