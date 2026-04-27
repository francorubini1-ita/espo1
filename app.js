// URL dell'API di Google Apps Script (il "ponte" verso il foglio Google)
const API = "https://script.google.com/macros/s/AKfycbzHmkvVWE12RA3MFycv4Cak9SghvkGYJzImfICdG4nLSKby47SIwnZgzXpR3cnRZrTh/exec";

// Database locale delle postazioni con coordinate GPS
const POSTAZIONI = [
  { id: 1, nome: "Postazione 1", lat: 44.877242, lon: 11.858320 },  
  { id: 2, nome: "Postazione 2", lat: 44.577242, lon: 11.358320 },  
  { id: 3, nome: "Postazione 3", lat: 44.574934, lon: 11.356581 },
  { id: 4, nome: "Postazione 4", lat: 44.572196, lon: 11.360316 },  
  { id: 5, nome: "Postazione 5", lat: 44.575620, lon: 11.364312 },  
  { id: 6, nome: "Postazione 6", lat: 44.558823, lon: 11.355419 },  
  { id: 7, nome: "Postazione 7", lat: 44.571503, lon: 11.352728 },  
  { id: 8, nome: "Postazione 8", lat: 44.556829, lon: 11.319514 }
];

/**
 * Genera il link per aprire Google Maps alle coordinate indicate
 */
function mapLink(lat, lon) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

/**
 * Funzione per scaricare e visualizzare tutte le prenotazioni esistenti.
 * Organizza i dati per data e ordina gli orari cronologicamente.
 */
async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  if (!container) return;
  container.innerHTML = "<p style='text-align:center; padding:30px;'>🔄 Caricamento...</p>";

  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    const gruppi = {};
    
    // Raggruppa le prenotazioni per data
    bookings.forEach(b => {
      let dKey = b.data; 
      if (dKey && dKey.includes("T")) {
        dKey = dKey.split("T")[0]; // Pulisce formato data ISO se presente
      }
      if (!dKey) dKey = "Senza Data";

      if (!gruppi[dKey]) gruppi[dKey] = [];
      gruppi[dKey].push(b);
    });

    let html = "";
    // Ordina le date e genera l'HTML per ogni gruppo
    Object.keys(gruppi).sort().forEach(dateKey => {
      const dF = dateKey.split("-").reverse().join("/"); // Formatta in DD/MM/YYYY
      html += `<div class="date-group-header">${dF}</div>`;
      
      // Ordina per orario di inizio e crea le card
      gruppi[dateKey].sort((a,b) => a.inizio.toString().localeCompare(b.inizio.toString())).forEach(b => {
        const badgeClass = b.espositore === 'B' ? 'badge-b' : 'badge-a';
        html += `
          <div class="booking-card">
            <div style="flex: 1; min-width: 0;">
              <strong style="font-size:24px; display:block; margin-bottom:4px;">${b.nome}</strong>
              <span style="font-size:19px; opacity:0.8;">Post. ${b.postazione} | 🕒 ${b.inizio}-${b.fine}</span>
            </div>
            <div class="badge ${badgeClass}">Esp.<span>${b.espositore}</span></div>
          </div>`;
      });
    });
    container.innerHTML = html || "<p style='text-align:center;'>Nessuna prenotazione.</p>";
  } catch (e) { 
    container.innerHTML = "<p style='text-align:center;'>Errore di sincronizzazione.</p>"; 
  }
}

// Rende la funzione accessibile globalmente
window.caricaRiepilogo = caricaRiepilogo;

/**
 * Gestisce il controllo di disponibilità prima della prenotazione.
 * Include validazioni su date passate, orari invertiti e sovrapposizioni.
 */
document.getElementById("check").onclick = async () => {
  const espositore = document.getElementById("espositore").value;
  const dateVal = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const sendBtn = document.getElementById("send");

  // Disabilita il tasto invio finché non viene superato il controllo
  sendBtn.disabled = true;

  // Calcolo riferimenti temporali attuali per validazione
  const oraAttuale = new Date();
  const z = oraAttuale.getTimezoneOffset() * 60 * 1000;
  const oggiLocale = new Date(oraAttuale - z).toISOString().split('T')[0];
  const orarioAdesso = oraAttuale.getHours().toString().padStart(2, '0') + ":" + 
                       oraAttuale.getMinutes().toString().padStart(2, '0');

  // Blocchi logici preventivi
  if (!dateVal || !start || !end) {
    alert("⚠️ Inserisci data, ora inizio e ora fine.");
    return;
  }
  if (dateVal < oggiLocale) {
    alert("❌ Non puoi prenotare una data passata!");
    return;
  }
  if (dateVal === oggiLocale && start < orarioAdesso) {
    alert("❌ L'orario di inizio è già passato!");
    return;
  }
  if (start >= end) {
    alert("❌ L'orario di fine deve essere successivo a quello di inizio!");
    return;
  }

  const checkingOverlay = document.getElementById("checkingOverlay");
  checkingOverlay.style.display = "flex";

  try {
    // Interroga il server Google per verificare sovrapposizioni nel database
    const res = await fetch(`${API}?action=check&date=${dateVal}&start=${start}&end=${end}&espositore=${espositore}`);
    const data = await res.json();
    
    checkingOverlay.style.display = "none";

    if (data.ok) {
      alert(`✅ Libero! Puoi procedere.`);
      sendBtn.disabled = false; // Sblocca il tasto finale
    } else {
      alert(`❌ Occupato da: ${data.with[0].name}`);
      sendBtn.disabled = true;
    }
  } catch (e) { 
    checkingOverlay.style.display = "none";
    alert("Errore di connessione al server."); 
  }
};

/**
 * FUNZIONE: Gestione del click sul tasto "Prenota"
 * Scopo: Raccogliere i dati, validarli e mostrare il popup di conferma finale.
 */
document.getElementById("send").onclick = () => {
  // 1. Recupera l'ID utente dall'URL (passato da Telegram)
  const urlParams = new URLSearchParams(window.location.search);
  
  // 2. Crea l'oggetto "payload" con tutti i dati inseriti dall'utente nel modulo
  const payload = {
    action: "submit", // Indica allo script di Google che vogliamo inserire una nuova riga
    telegramId: urlParams.get('user'), // Prende il parametro 'user' dall'URL
    espositore: document.getElementById("espositore").value, // Valore A o B
    date: document.getElementById("date").value, // Data selezionata (YYYY-MM-DD)
    start: document.getElementById("start").value, // Orario inizio
    end: document.getElementById("end").value, // Orario fine
    name: document.getElementById("name").value.trim(), // Nome (rimuove spazi inutili ai lati)
    postazione: document.getElementById("postazione").value // Numero della postazione
  };

  // 3. Validazione Nome: Se il nome è più corto di 3 lettere, blocca tutto e avvisa l'utente
  if (payload.name.length < 3) return alert("Inserisci il tuo nome completo.");

  // 4. Formattazione Data: Trasforma la data da "2026-04-27" a "27/04/2026" per renderla leggibile
  const dConf = payload.date.split("-").reverse().join("/");

  // 5. Costruzione del Riepilogo Visivo: Inserisce i dati nel testo della finestra di conferma (modal)
  // Qui aggiungiamo Nome e Numero Postazione come richiesto
  document.getElementById("confirmText").innerHTML = `
    <b>Nome:</b> ${payload.name}<br>
    <b>Postazione:</b> ${payload.postazione}<br>
    <b>Espositore:</b> ${payload.espositore}<br>
    <b>Data:</b> ${dConf}<br>
    <b>Orario:</b> ${payload.start} - ${payload.end}
  `;

  // 6. Mostra il popup (modal) impostando lo stile display su "flex"
  document.getElementById("confirmModal").style.display = "flex";
  
  // 7. Salvataggio Temporaneo: Salva i dati in una variabile globale
  // Questa verrà usata dalla funzione "confirmYes" se l'utente preme "Sì, conferma"
  window.currentBooking = payload;
};

/**
 * Conferma definitiva: invia i dati al foglio Google tramite POST
 */
document.getElementById("confirmYes").onclick = async () => {
  document.getElementById("confirmModal").style.display = "none";
  document.getElementById("loadingOverlay").style.display = "flex";
  try {
    await fetch(API, { method: "POST", body: JSON.stringify(window.currentBooking) });
    window.location.reload(); // Ricarica per aggiornare la lista
  } catch (e) { 
    alert("Errore invio."); 
    document.getElementById("loadingOverlay").style.display = "none";
  }
};

// Chiude il modal senza salvare
document.getElementById("confirmNo").onclick = () => document.getElementById("confirmModal").style.display = "none";

/**
 * Inizializzazione dell'app al caricamento della pagina
 */
window.onload = () => {
  // Imposta la data minima sul calendario (Oggi)
  const oggi = new Date().toISOString().split("T")[0];
  const dateIn = document.getElementById("date");
  if(dateIn) { 
    dateIn.value = oggi; 
    dateIn.setAttribute("min", oggi); 
  }

  // Gestione menu laterale delle postazioni
  document.getElementById("openPostazioni").onclick = () => document.getElementById("postazioniMenu").classList.add("show");
  document.getElementById("closePostazioni").onclick = () => document.getElementById("postazioniMenu").classList.remove("show");

  // Genera dinamicamente la lista delle postazioni nel menu
  const listContainer = document.getElementById("postazioniList");
  if(listContainer) {
    listContainer.innerHTML = POSTAZIONI.map(p => `
      <div style="padding:18px 0; border-bottom:1px solid var(--ios-border);">
        <strong style="font-size:22px;">${p.nome}</strong><br>
        <a href="${mapLink(p.lat, p.lon)}" target="_blank" style="color:var(--primary); font-size:20px; text-decoration:none;">📍 Apri Mappa GPS</a>
      </div>
    `).join("");
  }

  // Carica i dati esistenti
  caricaRiepilogo();
};
