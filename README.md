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
