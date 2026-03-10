/* =====================================================
   1. CONFIGURAZIONE E COSTANTI
===================================================== */
const API = "https://script.google.com/macros/s/AKfycbw1PkamNFSLC_VTRaNZh8FVkYmqgGx2rTkWykn4bM5eMJeODC4bHMNo73UmoZyRpx5n/exec";

// Elenco postazioni fisiche con coordinate per Google Maps
const POSTAZIONI = [
  { id: 1, nome: "Postazione 1", lat: 44.574728, lon: 11.363502 },
  { id: 2, nome: "Postazione 2", lat: 44.577320, lon: 11.361661 },
  { id: 3, nome: "Postazione 3", lat: 44.577225, lon: 11.358206 },
  { id: 4, nome: "Postazione 4", lat: 44.558822, lon: 11.355390 },
  { id: 5, nome: "Postazione 5", lat: 44.00000, lon: 11.00000 },
  { id: 6, nome: "Postazione 6", lat: 44.00000, lon: 11.00000 },
  { id: 7, nome: "Postazione 7", lat: 44.00000, lon: 11.00000 },
  { id: 8, nome: "Postazione 8", lat: 44.00000, lon: 11.00000 }
];

/* =====================================================
   2. RIFERIMENTI ELEMENTI UI
===================================================== */
const checkBtn = document.getElementById("check");
const sendBtn = document.getElementById("send");
const statusBox = document.getElementById("status");
const detailsPanel = document.getElementById("detailsPanel");
const loadingOverlay = document.getElementById("loadingOverlay");
const confirmModal = document.getElementById("confirmModal");

/* =====================================================
   3. FUNZIONI DI UTILITÀ E RESET
===================================================== */
function resetUI() {
  statusBox.classList.remove("show");
  detailsPanel.style.display = "none";
  detailsPanel.innerHTML = ""; 
  sendBtn.disabled = true;
  // Rimuove gli stati di errore dalle label
  document.querySelectorAll(".field-label").forEach(l => l.classList.remove("label-error"));
}

function mapLink(lat, lon) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

/* =====================================================
   4. LOGICA DI CONTROLLO DISPONIBILITÀ
===================================================== */
checkBtn.onclick = async () => {
  const espositore = document.getElementById("espositore").value;
  const dateValue = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  resetUI();

  // Validazione campi obbligatori
  if (!dateValue || !start || !end) {
    alert("Per favore, compila tutti i campi degli orari.");
    return;
  }

  // Controllo logico orario (Fine > Inizio)
  if (start >= end) {
    document.querySelector("label[for='start']").classList.add("label-error");
    document.querySelector("label[for='end']").classList.add("label-error");
    alert("L'orario di fine deve essere successivo a quello di inizio.");
    return;
  }

  // Feedback visivo di caricamento
  statusBox.classList.add("show");
  document.getElementById("msg").textContent = `Controllo Espositore ${espositore}...`;

  try {
    // Chiamata al server passando l'ID dell'espositore specifico
    const res = await fetch(`${API}?action=check&date=${dateValue}&start=${start}&end=${end}&espositore=${espositore}`);
    const data = await res.json();
    
    statusBox.classList.remove("show");

    if (data.ok) {
      alert(`✅ L'Espositore ${espositore} è libero per questa fascia oraria!`);
      sendBtn.disabled = false;
    } else {
      // Se occupato, mostra chi sta occupando quel specifico espositore
      detailsPanel.style.display = "block";
      const conflittiHtml = (data.with || []).map(c => 
        `<li><strong>${c.name}</strong> (${c.start} - ${c.end})</li>`
      ).join("");

      detailsPanel.innerHTML = `
        <strong style="color:var(--error); display:block; margin-bottom:8px;">Occupato su Espositore ${espositore}:</strong>
        <ul style="margin:0; padding-left:20px;">${conflittiHtml}</ul>
      `;
      alert(`❌ L'Espositore ${espositore} è già impegnato.`);
    }
  } catch (e) {
    statusBox.classList.remove("show");
    alert("Errore di comunicazione con il server.");
  }
};

/* =====================================================
   5. INVIO PRENOTAZIONE E CONFERMA
===================================================== */
sendBtn.onclick = () => {
  const name = document.getElementById("name").value.trim();
  if (name.length < 3) {
    alert("Inserisci un nome valido.");
    return;
  }

  const payload = {
    action: "submit",
    espositore: document.getElementById("espositore").value,
    date: document.getElementById("date").value,
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    name: name,
    postazione: document.getElementById("postazione").value
  };

  // Preparazione testo modale di conferma
  document.getElementById("confirmText").innerHTML = `
    <strong>Riepilogo:</strong><br>
    Espositore: ${payload.espositore}<br>
    Giorno: ${payload.date.split("-").reverse().join("/")}<br>
    Orario: ${payload.start} - ${payload.end}<br>
    Luogo: Postazione ${payload.postazione}
  `;
  
  confirmModal.style.display = "flex";
  window.currentBooking = payload; // Salvataggio temporaneo
};

document.getElementById("confirmNo").onclick = () => confirmModal.style.display = "none";

document.getElementById("confirmYes").onclick = async () => {
  confirmModal.style.display = "none";
  loadingOverlay.style.display = "flex";

  try {
    const res = await fetch(API, { 
      method: "POST", 
      body: JSON.stringify(window.currentBooking) 
    });
    const r = await res.json();
    
    if (r.success) {
      alert("Prenotazione salvata con successo!");
      window.location.reload(); 
    } else {
      alert("Errore durante il salvataggio: " + r.error);
    }
  } catch (e) {
    alert("Errore di rete durante l'invio.");
  } finally {
    loadingOverlay.style.display = "none";
  }
};

/* =====================================================
   6. RIEPILOGO E GESTIONE BADGE COLORATI
===================================================== */
async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  container.innerHTML = "<div class='status-msg'>Aggiornamento lista...</div>";
  
  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    
    let html = "";
    // Ordiniamo le prenotazioni per data
    bookings.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

    bookings.forEach(b => {
      // Determina la classe del badge in base all'espositore
      const badgeClass = b.espositore === "B" ? "badge badge-b" : "badge";
      
      html += `
        <div class="booking-card">
          <span class="${badgeClass}">Espositore ${b.espositore || 'A'}</span>
          <div class="booking-info">
            <strong>Post. ${b.postazione}</strong> - ${b.name}
          </div>
          <div class="booking-time">
            📅 ${b.date.split("-").reverse().join("/")} | 🕒 ${b.start} - ${b.end}
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html || "<div class='status-msg'>Nessuna prenotazione attiva.</div>";
  } catch (e) {
    container.innerHTML = "<div class='status-msg' style='color:red'>Errore nel caricamento dei dati.</div>";
  }
}

/* =====================================================
   7. INIZIALIZZAZIONE ALL'AVVIO
===================================================== */
window.addEventListener("load", () => {
  // Imposta data minima (oggi) nel calendario
  const oggi = new Date().toISOString().split("T")[0];
  document.getElementById("date").setAttribute("min", oggi);

  // Popola la lista delle postazioni nel menu drawer
  const list = document.getElementById("postazioniList");
  list.innerHTML = POSTAZIONI.map(p => `
    <div style="padding: 12px 0; border-bottom: 1px solid var(--ios-border);">
      <strong>${p.nome}</strong><br>
      <a href="${mapLink(p.lat, p.lon)}" target="_blank" style="color:var(--primary); font-size:14px; text-decoration:none;">📍 Apri in Maps</a>
    </div>
  `).join("");

  // Gestione apertura/chiusura menu postazioni
  document.getElementById("openPostazioni").onclick = () => document.getElementById("postazioniMenu").classList.add("show");
  document.getElementById("closePostazioni").onclick = () => document.getElementById("postazioniMenu").classList.remove("show");

  // Caricamento iniziale dei dati
  caricaRiepilogo();
});

