/* =====================================================
   CONFIGURAZIONE
===================================================== */
const API = "https://script.google.com/macros/s/AKfycbw1PkamNFSLC_VTRaNZh8FVkYmqgGx2rTkWykn4bM5eMJeODC4bHMNo73UmoZyRpx5n/exec";

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
   RIFERIMENTI UI
===================================================== */
const checkBtn = document.getElementById("check");
const sendBtn = document.getElementById("send");
const statusBox = document.getElementById("status");
const detailsPanel = document.getElementById("detailsPanel");

// Reset interfaccia tra un controllo e l'altro
function resetUI() {
  statusBox.classList.remove("show");
  detailsPanel.style.display = "none";
  detailsPanel.innerHTML = ""; 
  sendBtn.disabled = true;
  document.querySelectorAll(".field-label").forEach(l => l.classList.remove("label-error"));
}

/* =====================================================
   LOGICA DI CONTROLLO (Filtrata per Espositore)
===================================================== */
checkBtn.onclick = async () => {
  const espositore = document.getElementById("espositore").value;
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  resetUI();

  // Validazione base
  if (!date || !start || !end) {
    alert("Compila data e orari.");
    return;
  }

  // Controllo coerenza oraria
  if (start >= end) {
    alert("L'orario di fine deve essere dopo l'inizio.");
    return;
  }

  statusBox.classList.add("show");
  document.getElementById("msg").textContent = `Verifica disponibilità Espositore ${espositore}...`;

  try {
    // Inviamo l'ID dell'espositore al server per controllare solo quello specifico
    const res = await fetch(`${API}?action=check&date=${date}&start=${start}&end=${end}&espositore=${espositore}`);
    const data = await res.json();
    
    statusBox.classList.remove("show");

    if (data.ok) {
      alert(`✅ Espositore ${espositore} LIBERO!`);
      sendBtn.disabled = false;
    } else {
      detailsPanel.style.display = "block";
      const conflitti = (data.with || []).map(c => `<li>${c.name} (${c.start}-${c.end})</li>`).join("");
      detailsPanel.innerHTML = `<strong>Conflitti Espositore ${espositore}:</strong><ul>${conflitti}</ul>`;
      alert(`❌ Espositore ${espositore} occupato.`);
    }
  } catch (e) {
    alert("Errore di connessione.");
  }
};

/* =====================================================
   INVIO PRENOTAZIONE
===================================================== */
sendBtn.onclick = () => {
  const payload = {
    espositore: document.getElementById("espositore").value,
    date: document.getElementById("date").value,
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    name: document.getElementById("name").value,
    postazione: document.getElementById("postazione").value
  };

  document.getElementById("confirmText").innerHTML = `
    Espositore: ${payload.espositore}<br>
    Data: ${payload.date}<br>
    Orario: ${payload.start} - ${payload.end}<br>
    Nome: ${payload.name}
  `;
  document.getElementById("confirmModal").style.display = "flex";
  window.currentPayload = payload;
};

document.getElementById("confirmYes").onclick = async () => {
  document.getElementById("confirmModal").style.display = "none";
  document.getElementById("loadingOverlay").style.display = "flex";

  try {
    const res = await fetch(API, { 
        method: "POST", 
        body: JSON.stringify({ action: "submit", ...window.currentPayload }) 
    });
    const r = await res.json();
    if (r.success) {
      alert("Prenotazione registrata!");
      window.location.reload();
    }
  } catch (e) {
    alert("Errore invio.");
  } finally {
    document.getElementById("loadingOverlay").style.display = "none";
  }
};

/* =====================================================
   RIEPILOGO (Mostra a quale espositore appartiene)
===================================================== */
async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  container.innerHTML = "Caricamento...";
  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    
    let html = "";
    bookings.forEach(b => {
      html += `
        <div class="booking-card">
          <div class="booking-info">
            <span class="badge">Espositore ${b.espositore || 'A'}</span><br>
            <strong>Post. ${b.postazione}</strong> - ${b.name}
          </div>
          <div class="booking-time">${b.date} | ${b.start} - ${b.end}</div>
        </div>
      `;
    });
    container.innerHTML = html || "Nessuna prenotazione.";
  } catch (e) {
    container.innerHTML = "Errore caricamento.";
  }
}

// Inizializzazione mappe e lista
window.onload = () => {
    caricaRiepilogo();
    // Logica drawer mappe omessa per brevità, rimane uguale alla precedente
};

/* =====================================================
   RIEPILOGO E INIZIALIZZAZIONE
===================================================== */
async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  container.innerHTML = "<div class='status-msg'>Caricamento dati...</div>";
  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    renderRiepilogo(bookings);
  } catch (e) {
    container.innerHTML = "<div class='status-msg' style='color:red'>Errore caricamento</div>";
  }
}

function renderRiepilogo(bookings) {
  const container = document.getElementById("riepilogo");
  const grouped = {};

  bookings.forEach(b => {
    if (!grouped[b.date]) grouped[b.date] = [];
    grouped[b.date].push(b);
  });

  const sortedDates = Object.keys(grouped).sort();
  let html = "";

  sortedDates.forEach(date => {
    html += `<h3 class="riepilogo-date">${formattaData(date)}</h3>`;
    grouped[date].sort((a, b) => a.start.localeCompare(b.start));
    grouped[date].forEach(b => {
      html += `
        <div class="booking-card">
          <div class="booking-info"><strong>Post. ${b.postazione}</strong> - ${b.name}</div>
          <div class="booking-time">dalle ${b.start} alle ${b.end}</div>
        </div>
      `;
    });
  });
  container.innerHTML = html || "<div class='status-msg'>Nessuna prenotazione</div>";
}

function formattaData(iso) {
  const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${mesi[parseInt(m)-1]} ${y}`;
}

window.addEventListener("load", () => {
  const oggi = new Date().toISOString().split("T")[0];
  document.getElementById("date").setAttribute("min", oggi);
  
  const list = document.getElementById("postazioniList");
  list.innerHTML = POSTAZIONI.map(p => `
    <div style="padding: 10px 0; border-bottom: 1px solid var(--ios-border);">
      <strong>${p.nome}</strong><br>
      <a href="${mapLink(p.lat, p.lon)}" target="_blank" style="color:var(--primary);font-size:14px;">📍 Vedi Mappa</a>
    </div>
  `).join("");

  document.getElementById("openPostazioni").onclick = () => document.getElementById("postazioniMenu").classList.add("show");
  document.getElementById("closePostazioni").onclick = () => document.getElementById("postazioniMenu").classList.remove("show");

  caricaRiepilogo();
});
