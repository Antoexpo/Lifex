# LIFEX

Piattaforma dimostrativa con API Express e SPA Vite.

## Prerequisiti
- Node.js 18+

## Setup

```bash
npm install
npm run seed   # opzionale: popola DB SQLite con utenti demo
```

## Avvio in sviluppo

```bash
npm run dev:all
```

API disponibile su `http://localhost:3000`, SPA su `http://localhost:5173`.

## Test

```bash
npm test
```

## Variabili ambiente

- `DATABASE_URL` (opzionale, default SQLite `file:./dev.db`)
- `JWT_SECRET` (default `devsecret`)
- `REFRESH_SECRET` (default `refreshsecret`)

## Utenti demo

- Admin: `admin@example.com` / `adminpass`
- Staff: `staff@example.com` / `staffpass`
- Membro: `member@example.com` / `memberpass`

