/* =====================================================
   CONFIGURAZIONE E URL API
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

// Genera il link corretto per Google Maps
function mapLink(lat, lon) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

/* =====================================================
   RIFERIMENTI UI
===================================================== */
const checkBtn = document.getElementById("check");
const sendBtn = document.getElementById("send");
const statusBox = document.getElementById("status");
const loadingOverlay = document.getElementById("loadingOverlay");

/* =====================================================
   FUNZIONE RESET INTERFACCIA
===================================================== */
function resetUI() {
  statusBox.classList.remove("show");
  document.getElementById("detailsPanel").style.display = "none";
  sendBtn.disabled = true;
  // Reset colore label data
  document.querySelector("label[for='date']").classList.remove("label-error");
}

/* =====================================================
   LOGICA DI CONTROLLO DISPONIBILITÀ
===================================================== */
checkBtn.onclick = async () => {
  const dateInput = document.getElementById("date");
  const dateValue = dateInput.value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const dateLabel = document.querySelector("label[for='date']");

  // 1. Reset stato precedente
  resetUI();

  // 2. Validazione campi vuoti
  if (!dateValue || !start || !end) {
    alert("Inserisci data e orari.");
    return;
  }

  // 3. CONTROLLO DATA RETROATTIVA
  const dataScelta = new Date(dateValue);
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0); // Consideriamo solo il giorno, non l'ora attuale

  if (dataScelta < oggi) {
    dateLabel.classList.add("label-error"); // Diventa rossa (gestito in CSS)
    alert("Attenzione: non puoi prenotare una data passata.");
    return;
  }

  // 4. Avvio richiesta al server
  statusBox.classList.add("show");
  document.getElementById("msg").textContent = "Controllo...";

  try {
    const res = await fetch(`${API}?action=check&date=${dateValue}&start=${start}&end=${end}`);
    const data = await res.json();
    handleCheck(data);
  } catch (e) {
    document.getElementById("msg").textContent = "Errore server";
    setTimeout(resetUI, 3000);
  }
};

function handleCheck(res) {
  statusBox.classList.remove("show");
  if (res.ok) {
    alert("✅ Disponibile! Inserisci il nome e conferma.");
    sendBtn.disabled = false;
  } else {
    document.getElementById("detailsPanel").style.display = "block";
    const list = document.getElementById("conflictList");
    list.innerHTML = (res.with || []).map(c => `<li>${c.name}: ${c.start}-${c.end}</li>`).join("");
    sendBtn.disabled = true;
  }
}

/* =====================================================
   INVIO PRENOTAZIONE
===================================================== */
sendBtn.onclick = () => {
  const name = document.getElementById("name").value.trim();
  
  if (name.length < 3) {
    alert("Inserisci un nome valido (minimo 3 caratteri).");
    return;
  }

  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const postazione = document.getElementById("postazione").value;

  // Mostra riepilogo nella modale
  document.getElementById("confirmText").innerHTML = `
    <strong>Riepilogo:</strong><br>
    Data: ${date.split("-").reverse().join("/")}<br>
    Orario: ${start} - ${end}<br>
    Postazione: ${postazione}<br>
    Nome: ${name}
  `;
  document.getElementById("confirmModal").style.display = "flex";
};

document.getElementById("confirmNo").onclick = () => {
  document.getElementById("confirmModal").style.display = "none";
};

document.getElementById("confirmYes").onclick = async () => {
  document.getElementById("confirmModal").style.display = "none";
  loadingOverlay.style.display = "flex";
  loadingOverlay.classList.add("show");

  const payload = {
    action: "submit",
    date: document.getElementById("date").value,
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    name: document.getElementById("name").value,
    postazione: document.getElementById("postazione").value
  };

  try {
    const res = await fetch(API, { method: "POST", body: JSON.stringify(payload) });
    const r = await res.json();
    if (r.success) {
      alert("Prenotazione registrata!");
      location.reload(); 
    } else {
      alert("Errore: " + r.error);
    }
  } catch (e) {
    alert("Errore di rete");
  } finally {
    loadingOverlay.classList.remove("show");
    loadingOverlay.style.display = "none";
  }
};

/* =====================================================
   GESTIONE RIEPILOGO (STILE CARD)
===================================================== */
async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  container.innerHTML = "<div style='opacity:0.5;text-align:center;'>Caricamento...</div>";
  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    renderRiepilogo(bookings);
  } catch (e) {
    container.innerHTML = "Errore caricamento dati.";
  }
}

function renderRiepilogo(bookings) {
  const container = document.getElementById("riepilogo");
  const grouped = {};

  // Raggruppa per data
  bookings.forEach(b => {
    if (!grouped[b.date]) grouped[b.date] = [];
    grouped[b.date].push(b);
  });

  const sortedDates = Object.keys(grouped).sort();
  let html = "";

  sortedDates.forEach(date => {
    html += `<h3 class="riepilogo-date">${formattaData(date)}</h3>`;
    
    // Ordina per orario
    grouped[date].sort((a, b) => a.start.localeCompare(b.start));

    grouped[date].forEach(b => {
      html += `
        <div class="booking-card">
          <div class="booking-info">
            <strong>Post. ${b.postazione}</strong> - ${b.name}
          </div>
          <div class="booking-time">
            dalle ${b.start} alle ${b.end}
          </div>
        </div>
      `;
    });
  });

  container.innerHTML = html || "Nessuna prenotazione.";
}

function formattaData(isoDate) {
  const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const [y, m, d] = isoDate.split("-");
  return `${parseInt(d)} ${mesi[parseInt(m) - 1]} ${y}`;
}

/* =====================================================
   INIZIALIZZAZIONE
===================================================== */
window.onload = () => {
  // Imposta la data minima selezionabile nel calendario nativo
  const oggiStr = new Date().toISOString().split("T")[0];
  document.getElementById("date").setAttribute("min", oggiStr);

  caricaRiepilogo();

  // Gestione menu postazioni
  document.getElementById("openPostazioni").onclick = () => {
    const list = document.getElementById("postazioniList");
    list.innerHTML = POSTAZIONI.map(p => `
      <div style="padding:10px 0; border-bottom:1px solid var(--ios-border);">
        <strong>${p.nome}</strong><br>
        <a href="${mapLink(p.lat, p.lon)}" target="_blank" style="color:var(--primary);">📍 Vedi Mappa</a>
      </div>
    `).join("");
    document.getElementById("postazioniMenu").classList.add("show");
  };

  document.getElementById("closePostazioni").onclick = () => {
    document.getElementById("postazioniMenu").classList.remove("show");
  };
};
