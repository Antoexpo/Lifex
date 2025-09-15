# LIFEX UI

Interfaccia statica mock del pannello gestionale **LIFEX** per Life Luxury.

## Avvio locale
- Aprire il file `lifex-ui/src/index.html` con un browser moderno (doppio click) **oppure**
- Avviare un mini server HTTP: `cd lifex-ui && python -m http.server` e visitare `http://localhost:8000/src/`

## Deploy
- **cPanel**: caricare l'intera cartella `lifex-ui` sullo spazio web.
- **GitHub Pages**: creare un repository e pubblicare la cartella `lifex-ui`; impostare come root della pagina.

## Struttura
```
lifex-ui/
  public/        asset statici (logo, sprite icone)
  src/           HTML/CSS/JS vanilla
    data/        dati finti JSON
    views/       markup delle viste
```
Modificare i dati nelle rispettive `src/data/*.json`.

## Roadmap
1. UI statica (questo progetto)
2. Validazioni client-side e modali avanzate
3. Integrazione API reali e autenticazione

## Nuove Rotte
- `#/network` — visualizza l'albero generazionale con ricerca, filtri di profondità ed apertura/chiusura dei nodi.
- `#/catalog` — mostra il catalogo prodotti con filtri e permette l'uso del mini carrello demo nella topbar.
- `#/wallet` — pannello Conto Interno con saldo, ledger e azioni di deposito/prelievo/trasferimento simulate.

## Codice Cliente (13 caratteri)
Formato: `LLX` + anno corrente (YYYY) + 6 cifre estratte dal codice fiscale. Se le cifre disponibili sono meno di 6 vengono riempite a destra con zeri; se il codice fiscale è assente o senza numeri viene generata una combinazione casuale. La generazione avviene a ogni caricamento lato client e non viene salvata su backend.

## Mappa Codici
Nella vista **Membri** è presente il pulsante “Copia mappa codici”: apre una modal con la mappa `oldCode -> newCode` generata in runtime. È possibile copiare il JSON negli appunti per l'esportazione manuale (demo).

## Wallet (mock)
Il Conto Interno mostra il saldo disponibile, le entrate/uscite in attesa e il ledger. Le azioni di Deposito, Prelievo e Trasferimento aggiungono movimenti con stato `in_attesa`, validando importi e (per i trasferimenti) il codice destinatario. Nessuna operazione viene persistita: al refresh i dati tornano a quelli di `wallet.json`.

## TODO Backend
- Persistenza dei codici cliente generati e sincronizzazione con l'albero.
- API per checkout/catalogo e conferma degli ordini.
- Endpoint per registrare movimenti wallet (depositi/prelievi/transfer) e aggiornare i saldi reali.
- Gestione posizionamento albero con slot e vincoli reali.

## Changelog UI
- aggiunti network/catalog/wallet; generator codici cliente
