# Foto ricordo su Google Drive

L’invito apre la fotocamera, mostra l’anteprima e invia la foto solo dopo aver premuto **Salva su Drive**. Il server Vercel inoltra lo scatto al webhook Apps Script; la foto resta nella cartella Drive privata indicata sotto.

## Google Apps Script

1. Apri [script.google.com](https://script.google.com/) e crea un progetto.
2. Incolla il contenuto di `scripts/drive-photo-webhook.gs` nel file `Code.gs`.
3. Seleziona `initializeDriveWebhook` e premi **Esegui**. Autorizza l’accesso a Drive. La funzione controlla la cartella e crea una chiave segreta una sola volta: copiala dai log di esecuzione.
4. In **Deploy → New deployment**, scegli **Web app**. Imposta **Execute as: Me** e accesso **Anyone**, quindi fai **Deploy** e autorizza quando richiesto.
5. Copia l’URL della Web App che termina in `/exec`.

La cartella configurata nello script è quella condivisa per questa integrazione:
`https://drive.google.com/drive/folders/1TGrE-60Fxc4hYbZVzWwv3Q2KFoWpMj_k`

L’account che esegue il deploy deve poter scrivere in quella cartella. Le foto non vengono rese pubbliche: lo script le salva senza cambiare le autorizzazioni del file.

## Variabili Vercel

In **Project → Settings → Environment Variables**, per Production (e Preview se necessario), aggiungi:

```env
PHOTO_UPLOAD_WEBHOOK_URL="URL_WEB_APP_TERMINA_CON_exec"
PHOTO_UPLOAD_SECRET="valore_PHOTO_UPLOAD_SECRET_copiato_dai_log"
VITE_PHOTO_SNAPSHOTS_ENABLED="true"
```

Salva le variabili e ridistribuisci il progetto. Il segreto va tenuto solo nelle proprietà dello script e nelle variabili server Vercel; non inserirlo nel codice frontend o in Git.

La fotocamera funziona su HTTPS (il dominio Vercel) o su `localhost`. Per aggiornare il codice dello script dopo una modifica, crea una nuova versione da **Deploy → Manage deployments → Edit → New version**.
