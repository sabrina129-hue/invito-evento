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

In locale imposta:

```env
INVITE_TABLE="partecipanti_nome_invito"
```

Online imposta lo stesso valore su Vercel.

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
