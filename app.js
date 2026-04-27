// URL dell'API di Google Apps Script
const API = "https://script.google.com/macros/s/AKfycbzHmkvVWE12RA3MFycv4Cak9SghvkGYJzImfICdG4nLSKby47SIwnZgzXpR3cnRZrTh/exec";

// Database locale delle postazioni
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

function mapLink(lat, lon) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

/**
 * Carica le prenotazioni e mantiene lo stile scuro
 */
async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  if (!container) return;
  
  // Forza lo sfondo scuro anche durante il caricamento per evitare il flash bianco
  container.innerHTML = "<p style='text-align:center; padding:30px; color:white;'>🔄 Caricamento...</p>";

  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    const gruppi = {};
    
    bookings.forEach(b => {
      let dKey = b.data; 
      if (dKey && dKey.includes("T")) dKey = dKey.split("T")[0];
      if (!dKey) dKey = "Senza Data";
      if (!gruppi[dKey]) gruppi[dKey] = [];
      gruppi[dKey].push(b);
    });

    let html = "";
    Object.keys(gruppi).sort().forEach(dateKey => {
      const dF = dateKey.split("-").reverse().join("/");
      html += `<div class="date-group-header">${dF}</div>`;
      
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
    container.innerHTML = html || "<p style='text-align:center; color:white;'>Nessuna prenotazione.</p>";
  } catch (e) { 
    container.innerHTML = "<p style='text-align:center; color:white;'>Errore di sincronizzazione.</p>"; 
  }
}

window.caricaRiepilogo = caricaRiepilogo;

/**
 * Controllo disponibilità
 */
document.getElementById("check").onclick = async () => {
  const espositore = document.getElementById("espositore").value;
  const dateVal = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const sendBtn = document.getElementById("send");

  sendBtn.disabled = true;

  const oraAttuale = new Date();
  const z = oraAttuale.getTimezoneOffset() * 60 * 1000;
  const oggiLocale = new Date(oraAttuale - z).toISOString().split('T')[0];
  const orarioAdesso = oraAttuale.getHours().toString().padStart(2, '0') + ":" + 
                       oraAttuale.getMinutes().toString().padStart(2, '0');

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
    const res = await fetch(`${API}?action=check&date=${dateVal}&start=${start}&end=${end}&espositore=${espositore}`);
    const data = await res.json();
    checkingOverlay.style.display = "none";

    if (data.ok) {
      alert(`✅ Libero! Puoi procedere.`);
      sendBtn.disabled = false;
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
 * Gestione click "Prenota" - AGGIORNATA CON TELEFONO
 */
document.getElementById("send").onclick = () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Recupero dati dai campi
  const payload = {
    action: "submit",
    telegramId: urlParams.get('user') || "Utente Web",
    espositore: document.getElementById("espositore").value,
    date: document.getElementById("date").value,
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    name: document.getElementById("name").value.trim(),
    postazione: document.getElementById("postazione").value,
    phone: document.getElementById("phone").value.trim() // Cattura "Il tuo numero di telefono"
  };

  if (payload.name.length < 3) return alert("Inserisci il tuo nome completo.");
  if (payload.phone.length < 6) return alert("Inserisci il tuo numero di telefono.");

  const dConf = payload.date.split("-").reverse().join("/");

  // Mostra riepilogo nel modal
  document.getElementById("confirmText").innerHTML = `
    <b>Nome:</b> ${payload.name}<br>
    <b>Telefono:</b> ${payload.phone}<br>
    <b>Postazione:</b> ${payload.postazione}<br>
    <b>Espositore:</b> ${payload.espositore}<br>
    <b>Data:</b> ${dConf}<br>
    <b>Orario:</b> ${payload.start} - ${payload.end}
  `;

  document.getElementById("confirmModal").style.display = "flex";
  window.currentBooking = payload;
};

/**
 * Conferma definitiva
 */
document.getElementById("confirmYes").onclick = async () => {
  document.getElementById("confirmModal").style.display = "none";
  document.getElementById("loadingOverlay").style.display = "flex";
  try {
    await fetch(API, { method: "POST", body: JSON.stringify(window.currentBooking) });
    window.location.reload(); 
  } catch (e) { 
    alert("Errore invio."); 
    document.getElementById("loadingOverlay").style.display = "none";
  }
};

document.getElementById("confirmNo").onclick = () => document.getElementById("confirmModal").style.display = "none";

/**
 * Inizializzazione
 */
window.onload = () => {
  // Impedisce lo sfondo bianco forzando il colore body se necessario
  document.body.style.backgroundColor = "#121212"; 

  const oggi = new Date().toISOString().split("T")[0];
  const dateIn = document.getElementById("date");
  if(dateIn) { 
    dateIn.value = oggi; 
    dateIn.setAttribute("min", oggi); 
  }

  document.getElementById("openPostazioni").onclick = () => document.getElementById("postazioniMenu").classList.add("show");
  document.getElementById("closePostazioni").onclick = () => document.getElementById("postazioniMenu").classList.remove("show");

  const listContainer = document.getElementById("postazioniList");
  if(listContainer) {
    listContainer.innerHTML = POSTAZIONI.map(p => `
      <div style="padding:18px 0; border-bottom:1px solid #333;">
        <strong style="font-size:22px; color:white;">${p.nome}</strong><br>
        <a href="${mapLink(p.lat, p.lon)}" target="_blank" style="color:#0A84FF; font-size:20px; text-decoration:none;">📍 Apri Mappa GPS</a>
      </div>
    `).join("");
  }

  caricaRiepilogo();
};

