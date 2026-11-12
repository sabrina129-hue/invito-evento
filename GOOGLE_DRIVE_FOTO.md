# Foto ricordo su Google Drive

L’invito acquisisce una foto dalla fotocamera, mostra un’anteprima e la carica solo quando l’ospite preme **Salva su Drive**. Il browser non riceve credenziali Google.

## Collegare il Drive dell’organizzatore

1. In Google Cloud Console crea un progetto e abilita **Google Drive API**.
2. Configura la schermata di consenso OAuth e crea un client OAuth di tipo **Web application**.
3. Aggiungi questo URI tra gli URI di reindirizzamento autorizzati: `http://localhost:8787/oauth2callback`.
4. Scarica il JSON del client OAuth e salvalo nella cartella del progetto come `google-oauth-client.json`. Il file è escluso da Git.
5. Nel terminale del progetto esegui `pnpm connect:drive`, apri il link stampato, accedi con l’account Drive dell’organizzatore e autorizza l’accesso. Lo script crea la cartella **Istantanee Laurea Corrado** nel Drive selezionato.
6. Lo script stampa quattro variabili. Inseriscile in **Vercel → Project Settings → Environment Variables** per Production e Preview:

   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_DRIVE_REFRESH_TOKEN`
   - `GOOGLE_DRIVE_FOLDER_ID`

7. Imposta anche `VITE_PHOTO_SNAPSHOTS_ENABLED=true` in Vercel per mostrare il pulsante.
8. Ridistribuisci il progetto. Le credenziali e il refresh token devono restare solo in Vercel e nei file locali ignorati da Git.

Se la schermata OAuth è in modalità test, aggiungi l’account Drive dell’organizzatore come utente di test. La fotocamera richiede HTTPS (già disponibile sul dominio Vercel) oppure `localhost` in sviluppo.
