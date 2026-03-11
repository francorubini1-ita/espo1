/** * CONFIGURAZIONE API 
 * Ricordati di aggiornare questo URL dopo ogni distribuzione "Nuova Distribuzione" su Apps Script 
 */
const API = "https://script.google.com/macros/s/AKfycbw1PkamNFSLC_VTRaNZh8FVkYmqgGx2rTkWykn4bM5eMJeODC4bHMNo73UmoZyRpx5n/exec";

// Coordinate per le postazioni
const POSTAZIONI = [
  { id: 1, nome: "Postazione 1", lat: 44.574728, lon: 11.363502 },
  { id: 2, nome: "Postazione 2", lat: 44.577320, lon: 11.361661 },
  { id: 3, nome: "Postazione 3", lat: 44.577225, lon: 11.358206 },
  { id: 4, nome: "Postazione 4", lat: 44.558822, lon: 11.355390 },
  { id: 5, nome: "Postazione 5", lat: 44.574728, lon: 11.363502 },
  { id: 6, nome: "Postazione 6", lat: 44.577320, lon: 11.361661 },
  { id: 7, nome: "Postazione 7", lat: 44.577225, lon: 11.358206 },
  { id: 8, nome: "Postazione 8", lat: 44.558822, lon: 11.355390 }
];

/**
 * LOGICA DI CONTROLLO DISPONIBILITÀ
 */
document.getElementById("check").onclick = async () => {
  const espositore = document.getElementById("espositore").value;
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  if (!date || !start || !end) return alert("Compila tutti i campi!");

  // Chiamata al server per verificare conflitti su quello specifico espositore
  try {
    const res = await fetch(`${API}?action=check&date=${date}&start=${start}&end=${end}&espositore=${espositore}`);
    const data = await res.json();

    if (data.ok) {
      alert(`✅ Bene, l'espositore ${espositore} è libero!`);
      document.getElementById("send").disabled = false;
    } else {
      alert(`❌ Occupato da: ${data.with[0].name}`);
      document.getElementById("send").disabled = true;
    }
  } catch (e) { alert("Errore connessione API"); }
};

/**
 * INVIO PRENOTAZIONE
 */
document.getElementById("send").onclick = () => {
  const payload = {
    action: "submit",
    espositore: document.getElementById("espositore").value,
    date: document.getElementById("date").value,
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    name: document.getElementById("name").value,
    postazione: document.getElementById("postazione").value
  };

  document.getElementById("confirmText").innerHTML = `Espositore ${payload.espositore}<br>${payload.date}<br>${payload.start}-${payload.end}`;
  document.getElementById("confirmModal").style.display = "flex";
  window.currentBooking = payload;
};

document.getElementById("confirmYes").onclick = async () => {
  document.getElementById("confirmModal").style.display = "none";
  document.getElementById("loadingOverlay").style.display = "flex";

  try {
    await fetch(API, { method: "POST", body: JSON.stringify(window.currentBooking) });
    window.location.reload();
  } catch (e) { alert("Errore durante l'invio"); }
};

/**
 * GESTIONE TENDINA LATERALE (DRAWER)
 */
document.getElementById("openPostazioni").onclick = () => {
  document.getElementById("postazioniMenu").classList.add("show");
};

document.getElementById("closePostazioni").onclick = () => {
  document.getElementById("postazioniMenu").classList.remove("show");
};

/**
 * CARICAMENTO RIEPILOGO INIZIALE
 */
async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    container.innerHTML = bookings.map(b => `
      <div class="booking-card">
        <span class="badge ${b.espositore === 'B' ? 'badge-b' : ''}">Espositore ${b.espositore || 'A'}</span>
        <div><strong>${b.name}</strong> - Post. ${b.postazione}</div>
        <div style="font-size:12px; opacity:0.7;">${b.date} | ${b.start} - ${b.end}</div>
      </div>
    `).join("");
  } catch (e) { container.innerHTML = "Errore caricamento riepilogo."; }
}

window.onload = () => {
  caricaRiepilogo();
  // Popola la lista mappe nella tendina
  const list = document.getElementById("postazioniList");
  list.innerHTML = POSTAZIONI.map(p => `
    <div style="padding:15px 0; border-bottom:1px solid #eee;">
      <strong>${p.nome}</strong><br>
      <a href="https://www.google.com/maps?q=${p.lat},${p.lon}" target="_blank" style="color:var(--primary); font-size:13px;">📍 Apri Mappa</a>
    </div>
  `).join("");
};



