# Controllo Accessi – progetto Android

App per registrare entrate e uscite tramite QR code ed esportare il registro in Excel.
I dati restano salvati sul telefono su cui è installata l'app.

## Strada A – APK senza installare nulla (GitHub)

1. Crea un account gratuito su github.com e poi un nuovo repository (pulsante "New").
2. Nella pagina del repository scegli "uploading an existing file" e trascina
   **tutto il contenuto** di questa cartella (non la cartella stessa). Premi "Commit changes".
3. Controlla che sia presente il file `.github/workflows/crea-apk.yml`. Alcuni browser
   non caricano le cartelle che iniziano con il punto: in quel caso usa
   "Add file > Create new file", scrivi come nome `.github/workflows/crea-apk.yml`
   e incolla il contenuto del file.
4. Apri la scheda **Actions**: la compilazione parte da sola e dura circa 5 minuti.
5. A fine lavoro apri l'esecuzione completata e scarica **ControlloAccessi-APK**
   (uno .zip che contiene il file .apk).

## Strada B – Android Studio

1. Installa Node.js (versione 22) e Android Studio.
2. Da terminale, in questa cartella: `npm install` e poi `npx cap sync android`.
3. `npx cap open android`, attendi la sincronizzazione di Gradle,
   poi menu **Build > Build App Bundle(s) / APK(s) > Build APK(s)**.

## Installare l'APK sul telefono

Copia l'APK sul telefono (email, Drive, cavo USB), aprilo e consenti
"Installa app sconosciute" quando Android lo chiede. Al primo avvio della
scansione concedi il permesso per la fotocamera.

## Come funziona

Ogni persona installa l'app sul proprio telefono e al primo avvio scrive il suo nome.
All'ingresso è appeso un QR code: la prima scansione registra l'entrata, la seconda l'uscita.
I passaggi vengono scritti in un foglio Google sul Drive dell'amministratore.
Senza connessione il passaggio resta salvato sul telefono e viene inviato appena possibile.

## Collegare il foglio Google (una volta sola, a cura dell'amministratore)

Lo script da incollare è in `google-apps-script/Codice.gs`.

1. Crea un nuovo foglio Google, poi menu Estensioni > Apps Script.
2. Cancella il contenuto del file Codice.gs, incolla lo script e salva.
3. In alto scegli la funzione `preparaFoglio` e premi Esegui. Concedi le autorizzazioni
   (se compare "Google non ha verificato questa app": Avanzate > Vai a ...).
4. Premi Esegui il deployment > Nuovo deployment > tipo "App web".
   Esegui come: Me. Chi ha accesso: Chiunque. Premi Esegui il deployment e copia l'URL.
5. Torna nel foglio, ricarica la pagina, menu Controllo accessi > Mostra il QR dell'ingresso,
   incolla l'URL. Stampa il QR e appendilo all'ingresso.

Se modifichi lo script: Esegui il deployment > Gestisci deployment > modifica (matita) >
Versione: Nuova versione > Esegui il deployment. L'URL e il QR restano uguali.

## iPhone (versione web)

La cartella `www` viene pubblicata automaticamente su GitHub Pages
(file `.github/workflows/pagina-web.yml`). Una volta sola: Settings > Pages >
Source: GitHub Actions. L'indirizzo è https://NOMEUTENTE.github.io/NOMEREPOSITORY/
Su iPhone si apre in Safari e si sceglie Condividi > Aggiungi alla schermata Home.
Quando modifichi l'app, cambia anche il numero di versione in `www/sw.js`.

## Aggiornamenti

L'APK è firmato con una chiave fissa (`android/app/controllo-accessi.keystore`):
le nuove versioni si installano sopra la precedente senza perdere i dati.
Non eliminare né sostituire quel file.

## Modificare l'app

L'interfaccia è tutta in `www/index.html`. Dopo una modifica esegui
`npx cap sync android` (o carica di nuovo il file su GitHub: l'APK si ricompila da solo).
