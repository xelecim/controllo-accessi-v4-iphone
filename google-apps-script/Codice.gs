/**
 * CONTROLLO ACCESSI – script per Google Fogli
 *
 * Riceve i passaggi inviati dall'app e li scrive nel foglio "Registro".
 * Il menu "Controllo accessi" (in alto nel foglio) serve all'amministratore.
 */

// Metti true se vuoi approvare a mano i nuovi utenti (colonna "Stato" del foglio Utenti).
const APPROVAZIONE_NUOVI_UTENTI = false;

const FOGLIO_REGISTRO = 'Registro';
const FOGLIO_UTENTI = 'Utenti';
const FOGLIO_PRESENTI = 'Presenti';

// Colonne del Registro
const C_NOME = 1, C_DATA_IN = 2, C_ORA_IN = 3, C_DATA_OUT = 4, C_ORA_OUT = 5, C_DURATA = 6, C_ID = 7, C_NOTE = 8;

/* ------------------------------------------------------------------ */
/* Menu per l'amministratore                                           */
/* ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Controllo accessi')
    .addItem('1. Prepara il foglio', 'preparaFoglio')
    .addItem("2. Mostra il QR dell'ingresso", 'mostraQR')
    .addSeparator()
    .addItem('Cambia il QR (disattiva quello vecchio)', 'cambiaQR')
    .addItem("Modifica l'indirizzo dell'app web", 'impostaUrl')
    .addToUi();
}

function preparaFoglio() {
  const ss = SpreadsheetApp.getActive();

  const reg = ss.getSheetByName(FOGLIO_REGISTRO) || ss.insertSheet(FOGLIO_REGISTRO, 0);
  if (reg.getLastRow() === 0) {
    reg.appendRow(['Nome', 'Data entrata', 'Ora entrata', 'Data uscita', 'Ora uscita', 'Durata', 'ID utente', 'Note']);
  }
  reg.setFrozenRows(1);
  reg.getRange('1:1').setFontWeight('bold');
  reg.getRange('B2:B').setNumberFormat('dd/MM/yyyy');
  reg.getRange('C2:C').setNumberFormat('HH:mm');
  reg.getRange('D2:D').setNumberFormat('dd/MM/yyyy');
  reg.getRange('E2:E').setNumberFormat('HH:mm');
  reg.getRange('F2:F').setNumberFormat('[h]:mm');
  reg.setColumnWidth(1, 200);

  const ut = ss.getSheetByName(FOGLIO_UTENTI) || ss.insertSheet(FOGLIO_UTENTI, 1);
  if (ut.getLastRow() === 0) {
    ut.appendRow(['ID utente', 'Nome', 'Stato', 'Registrato il', 'Ultimo passaggio']);
  }
  ut.setFrozenRows(1);
  ut.getRange('1:1').setFontWeight('bold');
  ut.getRange('D2:E').setNumberFormat('dd/MM/yyyy HH:mm');
  ut.getRange('C2:C').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Attivo', 'In attesa', 'Bloccato'], true).build()
  );
  ut.setColumnWidth(2, 200);

  const pr = ss.getSheetByName(FOGLIO_PRESENTI) || ss.insertSheet(FOGLIO_PRESENTI, 2);
  pr.clear();
  pr.getRange('A1:C1').setValues([['Nome', 'Data entrata', 'Ora entrata']]).setFontWeight('bold');
  pr.getRange('A2').setFormula('=IFERROR(FILTER(Registro!A2:C, Registro!A2:A<>"", Registro!D2:D=""), "Nessuno")');
  pr.getRange('B2:B').setNumberFormat('dd/MM/yyyy');
  pr.getRange('C2:C').setNumberFormat('HH:mm');
  pr.setFrozenRows(1);
  pr.setColumnWidth(1, 200);

  // Elimina il foglio vuoto iniziale, se c'è
  ss.getSheets().forEach(function (s) {
    const n = s.getName();
    if ([FOGLIO_REGISTRO, FOGLIO_UTENTI, FOGLIO_PRESENTI].indexOf(n) === -1 && s.getLastRow() === 0 && ss.getSheets().length > 3) {
      ss.deleteSheet(s);
    }
  });

  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('TOKEN')) p.setProperty('TOKEN', nuovoToken());

  SpreadsheetApp.getUi().alert(
    'Foglio pronto.\n\nOra pubblica lo script come app web (Esegui il deployment > Nuovo deployment), ' +
    'poi torna qui e usa "Mostra il QR dell\'ingresso".'
  );
}

function impostaUrl() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt(
    "Indirizzo dell'app web",
    'Incolla l\'URL che hai copiato dopo "Esegui il deployment". Finisce con /exec.',
    ui.ButtonSet.OK_CANCEL
  );
  if (r.getSelectedButton() !== ui.Button.OK) return null;
  const url = r.getResponseText().trim();
  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(url)) {
    ui.alert("L'indirizzo deve iniziare con https://script.google.com/ e finire con /exec. Riprova.");
    return null;
  }
  PropertiesService.getScriptProperties().setProperty('URL', url);
  return url;
}

function mostraQR() {
  const p = PropertiesService.getScriptProperties();
  let token = p.getProperty('TOKEN');
  if (!token) { token = nuovoToken(); p.setProperty('TOKEN', token); }
  const url = p.getProperty('URL') || impostaUrl();
  if (!url) return;
  const html = HtmlService.createHtmlOutput(
    QR_HTML.replace('__CONTENUTO__', JSON.stringify(url + '#k=' + token))
  ).setWidth(480).setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, "QR dell'ingresso");
}

function cambiaQR() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert(
    'Cambiare il QR?',
    "Il QR attuale smetterà di funzionare: dovrai stampare e appendere quello nuovo. Gli utenti non devono reinstallare nulla, basta che scansionino il nuovo QR.",
    ui.ButtonSet.OK_CANCEL
  );
  if (r !== ui.Button.OK) return;
  PropertiesService.getScriptProperties().setProperty('TOKEN', nuovoToken());
  mostraQR();
}

function nuovoToken() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 24);
}

/* ------------------------------------------------------------------ */
/* App web: riceve le richieste dall'app                               */
/* ------------------------------------------------------------------ */

function doGet() {
  return HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:24px;max-width:420px">' +
    '<h2>Controllo accessi</h2><p>Questo QR va scansionato con l\'app Controllo accessi, non con la fotocamera del telefono.</p></div>'
  ).setTitle('Controllo accessi');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return risposta({ ok: false, error: 'occupato' });
  }
  try {
    const req = JSON.parse(e.postData.contents);
    const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token || req.k !== token) return risposta({ ok: false, error: 'token' });
    if (req.action === 'scan') return risposta(registraPassaggio(req));
    if (req.action === 'status') return risposta(statoUtente(req));
    return risposta({ ok: false, error: 'dati' });
  } catch (err) {
    return risposta({ ok: false, error: 'server', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function risposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fogli() {
  const ss = SpreadsheetApp.getActive();
  return { reg: ss.getSheetByName(FOGLIO_REGISTRO), ut: ss.getSheetByName(FOGLIO_UTENTI) };
}

function trovaUtente(ut, uid) {
  const last = ut.getLastRow();
  if (last < 2) return null;
  const vals = ut.getRange(2, 1, last - 1, 3).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === uid) {
      return { row: i + 2, nome: String(vals[i][1] || ''), stato: String(vals[i][2] || '').trim() || 'Attivo' };
    }
  }
  return null;
}

function trovaVisitaAperta(reg, uid) {
  const last = reg.getLastRow();
  if (last < 2) return null;
  const vals = reg.getRange(2, 1, last - 1, C_ID).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    const r = vals[i];
    if (String(r[C_ID - 1]) === uid && r[C_DATA_OUT - 1] === '' && r[C_DATA_IN - 1] instanceof Date) {
      return { row: i + 2, entrata: r[C_DATA_IN - 1] };
    }
  }
  return null;
}

function controllaRichiesta(req) {
  const uid = String(req.uid || '');
  const nome = String(req.name || '').trim().slice(0, 80);
  if (!/^[A-Za-z0-9]{8,40}$/.test(uid) || !nome) return null;
  return { uid: uid, nome: nome };
}

function registraPassaggio(req) {
  const d = controllaRichiesta(req);
  if (!d) return { ok: false, error: 'dati' };

  const cache = CacheService.getScriptCache();
  const evKey = req.ev ? 'ev_' + String(req.ev).replace(/[^A-Za-z0-9]/g, '').slice(0, 40) : null;
  if (evKey) {
    const giaFatto = cache.get(evKey);
    if (giaFatto) return JSON.parse(giaFatto);
  }

  const f = fogli();
  if (!f.reg || !f.ut) return { ok: false, error: 'foglio' };

  const ora = new Date();
  let utente = trovaUtente(f.ut, d.uid);
  if (!utente) {
    const stato = APPROVAZIONE_NUOVI_UTENTI ? 'In attesa' : 'Attivo';
    f.ut.appendRow([d.uid, d.nome, stato, ora, '']);
    utente = { row: f.ut.getLastRow(), nome: d.nome, stato: stato };
  }
  if (utente.stato === 'Bloccato') return { ok: false, error: 'bloccato' };
  if (utente.stato !== 'Attivo') return { ok: false, error: 'attesa' };
  const nome = utente.nome || d.nome;

  // Passaggi salvati senza connessione: si usa l'orario del telefono
  let t = ora, ritardo = false;
  const ts = Number(req.ts);
  if (ts && ora.getTime() - ts > 120000 && ora.getTime() - ts < 7 * 864e5) {
    t = new Date(ts);
    ritardo = true;
  }

  let res;
  const aperta = trovaVisitaAperta(f.reg, d.uid);
  if (aperta && t.getTime() - aperta.entrata.getTime() < 60000) {
    // Doppia scansione entro un minuto dall'entrata: ignorata
    res = { ok: true, result: 'in', name: nome, time: aperta.entrata.getTime(), dup: true };
  } else if (aperta) {
    const durata = (t.getTime() - aperta.entrata.getTime()) / 864e5;
    f.reg.getRange(aperta.row, C_DATA_OUT, 1, 3).setValues([[t, t, durata]]);
    if (ritardo) {
      const cella = f.reg.getRange(aperta.row, C_NOTE);
      cella.setValue((cella.getValue() ? cella.getValue() + '; ' : '') + 'Uscita inviata in ritardo');
    }
    res = { ok: true, result: 'out', name: nome, time: t.getTime(), minutes: Math.round(durata * 1440) };
  } else {
    f.reg.appendRow([nome, t, t, '', '', '', d.uid, ritardo ? 'Entrata inviata in ritardo' : '']);
    res = { ok: true, result: 'in', name: nome, time: t.getTime() };
  }
  f.ut.getRange(utente.row, 5).setValue(t);
  if (evKey) cache.put(evKey, JSON.stringify(res), 21600);
  return res;
}

function statoUtente(req) {
  const d = controllaRichiesta(req);
  if (!d) return { ok: false, error: 'dati' };
  const f = fogli();
  if (!f.reg || !f.ut) return { ok: false, error: 'foglio' };
  const utente = trovaUtente(f.ut, d.uid);
  if (!utente) return { ok: true, registered: false };
  const aperta = trovaVisitaAperta(f.reg, d.uid);
  return {
    ok: true, registered: true, stato: utente.stato, name: utente.nome,
    inside: !!aperta, since: aperta ? aperta.entrata.getTime() : null
  };
}

/* ------------------------------------------------------------------ */
/* Finestra con il QR da stampare                                      */
/* ------------------------------------------------------------------ */

const QR_HTML = `<!doctype html><html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>
<style>
body{font-family:Arial,sans-serif;margin:0;padding:12px;text-align:center;color:#172033}
canvas{width:100%;max-width:420px;height:auto;border:1px solid #ddd}
.row{display:flex;gap:10px;justify-content:center;margin-top:12px}
button,a{font:inherit;font-weight:bold;padding:10px 16px;border-radius:10px;border:0;cursor:pointer;text-decoration:none}
button{background:#2B55E0;color:#fff} a{background:#eef1f4;color:#172033}
@media print{.row{display:none} canvas{border:0;max-width:none;width:100%}}
</style></head><body>
<canvas id="c"></canvas>
<div class="row"><button onclick="window.print()">Stampa</button><a id="dl" download="QR ingresso.png">Scarica immagine</a></div>
<script>
var testo=__CONTENUTO__;
var qr=qrcode(0,'M'); qr.addData(testo); qr.make();
var n=qr.getModuleCount(), cell=14, m=4*cell, size=n*cell+m*2, extra=170;
var c=document.getElementById('c'); c.width=size; c.height=size+extra;
var g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height);
g.fillStyle='#172033'; g.textAlign='center';
g.font='bold 44px Arial'; g.fillText('Controllo accessi',size/2,70);
g.font='26px Arial'; g.fillText("Scansiona con l'app per registrare entrata e uscita",size/2,115,size-40);
g.fillStyle='#000';
for(var r=0;r<n;r++)for(var k=0;k<n;k++)if(qr.isDark(r,k))g.fillRect(m+k*cell,extra-20+m+r*cell,cell,cell);
document.getElementById('dl').href=c.toDataURL('image/png');
</script></body></html>`;
