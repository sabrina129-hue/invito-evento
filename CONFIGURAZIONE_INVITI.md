# Configurazione inviti

## 1. Testi e immagini

Modifica testi, date, luogo, anteprima social e immagini da:

```text
src/data/event.js
```

Sezioni principali:

- `meta`: titolo pagina, anteprima social, immagine WhatsApp/social, favicon.
- `content`: titolo, data, ora, luoghi e immagini dell'invito.
- `rsvp`: testi del form ospiti.
- `admin`: testi della pagina admin.

Le immagini vanno messe in:

```text
public/images
```

Poi le richiami in `content.images`, per esempio:

```js
images: [
  "/images/mio-invito.jpeg",
]
```

## 2. Colori, font e forme

Modifica colori, font e rotondita da:

```text
src/theme.css
```

In VS Code vedrai i quadratini colore accanto ai valori HEX, per esempio `#883650`.
Clicca il quadratino per aprire il color picker e scegliere il colore.

Variabili principali:

- `--color-primary`: colore principale.
- `--color-secondary`: colore secondario.
- `--color-background`: sfondo pagina.
- `--color-surface`: card/contenitore invito.
- `--color-text`: testo principale.
- `--color-muted`: testo secondario.
- `--font-title`: font dei titoli.
- `--font-body`: font del testo.
- `--radius-card`, `--radius-input`, `--radius-button`: rotondita degli elementi.

## 3. Password admin

La password non deve stare nel codice frontend.

In locale cambiala in:

```text
.env.local
```

Variabili:

```env
ADMIN_PASSWORD="password-admin-del-singolo-invito"
ADMIN_TOKEN="token-lungo-random-del-singolo-invito"
```

Online devi impostare gli stessi valori nelle Environment Variables del progetto Vercel.

## 4. Database separato per ogni invito

Ogni invito puo usare una tabella Supabase diversa.

In locale apri `.env.local`.

Se la variabile non esiste, aggiungi questa riga:

```env
INVITE_TABLE="partecipanti_nome_invito"
```

Per l'invito attuale il valore di partenza puo essere:

```env
INVITE_TABLE="partecipanti"
```

Per un nuovo invito cambia solo il nome della tabella, per esempio:

```env
INVITE_TABLE="partecipanti_lucia_2026"
```

Online imposta lo stesso valore su Vercel.

Dopo aver cambiato `.env.local`, riavvia il server locale:

```bash
npx vercel dev
```

Per creare la tabella in Supabase:

1. apri Supabase;
2. vai in SQL Editor;
3. copia lo script `supabase-create-invite-table.sql`;
4. cambia `partecipanti_sabrina_2026` con il nome della nuova tabella;
5. esegui lo script;
6. usa lo stesso nome in `INVITE_TABLE`.

Esempio:

```env
INVITE_TABLE="partecipanti_compleanno_lucia_2026"
ADMIN_PASSWORD="password-solo-lucia"
ADMIN_TOKEN="token-solo-lucia"
```

In questo modo ogni invito ha:

- contenuti propri in `src/data/event.js`;
- password admin propria;
- token admin proprio;
- tabella Supabase propria.

## 5. Link Vercel diverso per ogni invito

La soluzione consigliata e:

```text
1 repo GitHub
1 branch per invito
1 progetto Vercel per invito
1 tabella Supabase per invito
```

Esempio:

```text
Branch Git: invito-lucia-2026
Progetto Vercel: invito-lucia-2026
Tabella Supabase: partecipanti_lucia_2026
```

Link pubblico:

```text
https://invito-lucia-2026.vercel.app/
```

Link admin:

```text
https://invito-lucia-2026.vercel.app/#/admin
```

### Creare un branch per un nuovo invito

Da terminale:

```bash
git checkout main
git pull
git checkout -b invito-lucia-2026
```

Poi modifica:

- `src/data/event.js` per testi, date, immagini e meta social.
- `src/theme.css` per colori, font e rotondita.
- `.env.local` per password admin, token e tabella Supabase locale.

### Creare il progetto Vercel collegato al branch

Su Vercel:

1. crea un nuovo Project;
2. collega lo stesso repository GitHub;
3. entra in `Project Settings`;
4. vai in `Environments`;
5. apri `Production`;
6. in `Branch Tracking` imposta il branch del nuovo invito, per esempio:

```text
invito-lucia-2026
```

Da quel momento quel progetto Vercel andra in produzione solo da quel branch.

### Variabili ambiente Vercel per ogni invito

Nel progetto Vercel del singolo invito imposta:

```env
SUPABASE_URL="https://..."
SUPABASE_KEY="..."
INVITE_TABLE="partecipanti_lucia_2026"
ADMIN_PASSWORD="password-solo-lucia"
ADMIN_TOKEN="token-random-solo-lucia"
```

`INVITE_TABLE`, `ADMIN_PASSWORD` e `ADMIN_TOKEN` devono essere diversi per ogni invito.

### Deploy del singolo invito

Quando modifichi il branch dell'invito:

```bash
git add .
git commit -m "Configura invito Lucia 2026"
git push origin invito-lucia-2026
```

Vercel aggiornera solo il progetto collegato a quel branch.

## 6. Procedura completa per un nuovo invito

1. Crea un branch dal `main`.
2. Cambia testi e immagini in `src/data/event.js`.
3. Cambia colori e font in `src/theme.css`.
4. Crea una nuova tabella Supabase usando `supabase-create-invite-table.sql`.
5. Imposta in `.env.local`:

```env
INVITE_TABLE="nome_tabella_del_nuovo_invito"
ADMIN_PASSWORD="password_del_nuovo_invito"
ADMIN_TOKEN="token_random_del_nuovo_invito"
```

6. Crea un nuovo progetto Vercel collegato allo stesso repo.
7. Imposta come Production Branch il branch del nuovo invito.
8. Inserisci in Vercel le Environment Variables del nuovo invito.
9. Fai push del branch.
10. Condividi il link pubblico agli invitati e il link `/#/admin` solo all'organizzatore.

## 7. Errore 500 quando un ospite preme Invia

Se sul sito pubblicato da Vercel il form mostra errore e nella console vedi:

```text
Failed to load resource: the server responded with a status of 500
```

controlla questi punti nel progetto Vercel del singolo invito:

1. `SUPABASE_URL` esiste ed e uguale al Project URL Supabase.
2. `SUPABASE_KEY` esiste ed e una chiave server/secret del progetto Supabase.
3. `INVITE_TABLE` esiste ed e scritto esattamente come la tabella Supabase.
4. La tabella e stata creata in Supabase usando `supabase-create-invite-table.sql`.
5. Dopo aver aggiunto o modificato le Environment Variables, hai fatto un nuovo deploy.

Esempio:

```env
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_KEY="sb_secret_..."
INVITE_TABLE="partecipanti_lucia_2026"
ADMIN_PASSWORD="password-solo-lucia"
ADMIN_TOKEN="token-random-solo-lucia"
```

Per vedere il dettaglio dell'errore:

1. vai su Vercel;
2. apri il progetto dell'invito;
3. vai in `Logs`;
4. riprova a inviare il form;
5. controlla il log della funzione `/api/rsvp`.

## 8. Upload foto su Google Drive

La pagina `/#/foto` permette agli invitati di autorizzare la fotocamera, scattare una foto e inviarla agli sposi. Quando premono `Invia`, il sito carica la foto nella cartella Drive configurata lato server.

Il caricamento passa da una Web App Google Apps Script. Per abilitarla su Vercel servono queste Environment Variables:

```env
PHOTO_UPLOAD_WEBHOOK_URL="https://script.google.com/macros/s/.../exec"
PHOTO_UPLOAD_SECRET="stessa-password-usata-nello-script"
```

Per l'invito attuale il webhook Apps Script e:

```text
https://script.google.com/macros/s/AKfycbybN2BSRKf-_b7tj1mg9hWNU20CdVP41aOBPxEg_Xt3RcBtrRymZQW6ftu2XzF41X77Vg/exec
```

`PHOTO_UPLOAD_SECRET` deve essere uguale al valore della costante `SECRET` nello script Google.
