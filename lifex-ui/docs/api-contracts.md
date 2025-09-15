# API Contracts (Draft)

Questa documentazione definisce i contratti previsti per l'integrazione futura dell'API LIFEX.
Tutti gli importi sono in EUR (float), le date in formato ISO 8601 e gli `id` sono stringhe.

## /members
- `GET /members?search=&status=&page=&pageSize=`
- `POST /members`
- `PUT /members/:id`
- `DELETE /members/:id`

### Esempio GET response
```json
{
  "data": [{"id":"m001","code":"LLX001","fullName":"Mario Rossi"}],
  "total": 1
}
```

## /vehicles
- `GET /vehicles?status=&category=&page=&pageSize=`
- `POST /vehicles`
- `PUT /vehicles/:id`
- `DELETE /vehicles/:id`

### Esempio vehicle
```json
{
  "id":"v001",
  "plate":"AB123CD",
  "model":"Model X",
  "brand":"Tesla",
  "category":"Luxury",
  "status":"disponibile",
  "monthlyFeeEUR":1200.0,
  "depositEUR":5000.0
}
```

## /orders
- `GET /orders?status=&type=&period=&page=&pageSize=`
- `POST /orders`
- `PUT /orders/:id`
- `DELETE /orders/:id`

### Esempio order
```json
{
  "id":"o001",
  "memberId":"m001",
  "vehicleId":"v001",
  "type":"canone",
  "amountEUR":199.0,
  "status":"pagato",
  "createdAt":"2024-01-01"
}
```

## /payouts
- `GET /payouts?status=&period=&page=&pageSize=`
- `POST /payouts`
- `PUT /payouts/:id`
- `DELETE /payouts/:id`

### Esempio payout
```json
{
  "id":"p001",
  "memberId":"m001",
  "period":"2024-01",
  "amountEUR":500.0,
  "status":"programmato",
  "scheduledFor":"2024-02-15"
}
```

---
Questa UI usa dati locali finti; nessuna chiamata reale.
