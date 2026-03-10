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

// Genera link per mappe mobile
function mapLink(lat, lon) {
  return `http://googleusercontent.com/maps.google.com/maps?q=${lat},${lon}&z=20&t=k`;
}

/* =====================================================
   RIFERIMENTI UI
===================================================== */
const checkBtn = document.getElementById("check");
const sendBtn = document.getElementById("send");
const statusBox = document.getElementById("status");
const icon = document.getElementById("icon");
const msg = document.getElementById("msg");
const loadingOverlay = document.getElementById("loadingOverlay");
const confirmModal = document.getElementById("confirmModal");

/* =====================================================
   FUNZIONE RESET INTERFACCIA
===================================================== */
function resetUI() {
  statusBox.classList.remove("show");
  document.getElementById("detailsPanel").style.display = "none";
  sendBtn.disabled = true;
  
  // Reset colori label
  document.querySelector("label[for='date']").classList.remove("label-error");
  document.querySelector("label[for='start']").classList.remove("label-error");
  document.querySelector("label[for='end']").classList.remove("label-error");
}

/* =====================================================
   LOGICA DI CONTROLLO DISPONIBILITÀ
===================================================== */
checkBtn.onclick = async () => {
  const dateInput = document.getElementById("date");
  const startInput = document.getElementById("start");
  const endInput = document.getElementById("end");
  
  const dateValue = dateInput.value;
  const start = startInput.value;
  const end = endInput.value;

  const dateLabel = document.querySelector("label[for='date']");
  const startLabel = document.querySelector("label[for='start']");
  const endLabel = document.querySelector("label[for='end']");

  resetUI();

  // 1. Validazione campi vuoti
  if (!dateValue || !start || !end) {
    alert("Compila tutti i campi della data e dell'orario.");
    return;
  }

  // 2. Controllo Data Passata
  const dataScelta = new Date(dateValue);
  const adesso = new Date();
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  if (dataScelta < oggi) {
    dateLabel.classList.add("label-error");
    alert("Non puoi prenotare una data passata!");
    return;
  }

  // 3. Controllo Ora Passata (se oggi)
  if (dataScelta.getTime() === oggi.getTime()) {
    const oraAttuale = adesso.getHours().toString().padStart(2, '0') + ":" + 
                       adesso.getMinutes().toString().padStart(2, '0');
    if (start < oraAttuale) {
      startLabel.classList.add("label-error");
      alert("L'orario di inizio selezionato è già passato.");
      return;
    }
  }

  // 4. Controllo Coerenza Oraria (Inizio deve essere prima di Fine)
  if (start >= end) {
    startLabel.classList.add("label-error");
    endLabel.classList.add("label-error");
    alert("L'orario di fine deve essere successivo a quello di inizio.");
    return;
  }

  // 5. Richiesta al Server
  statusBox.classList.add("show");
  icon.textContent = "⏳";
  msg.textContent = "Verifica espositore...";

  try {
    // Nota: action=check interroga il server per QUALSIASI occupazione nella fascia oraria
    const res = await fetch(`${API}?action=check&date=${dateValue}&start=${start}&end=${end}`);
    const data = await res.json();
    handleCheck(data);
  } catch (e) {
    icon.textContent = "⚠️";
    msg.textContent = "Errore connessione";
    setTimeout(resetUI, 3000);
  }
};

function handleCheck(res) {
  statusBox.classList.remove("show");

  if (res.ok) {
    alert("✅ L'espositore è libero in questa fascia oraria!");
    sendBtn.disabled = false;
  } else {
    // Se occupato, mostriamo i dettagli del conflitto (chi ha già prenotato)
    document.getElementById("detailsPanel").style.display = "block";
    const list = document.getElementById("conflictList");
    
    list.innerHTML = (res.with || []).map(c => 
      `<li><strong>${c.name}</strong> è già presente (${c.start} - ${c.end})</li>`
    ).join("");
    
    alert("❌ L'espositore è già prenotato in questo orario.");
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

  document.getElementById("confirmText").innerHTML = `
    <strong>Confermi questa prenotazione?</strong><br><br>
    Data: ${date.split("-").reverse().join("/")}<br>
    Orario: ${start} - ${end}<br>
    Postazione: ${postazione}<br>
    Nome: ${name}
  `;
  confirmModal.style.display = "flex";
};

document.getElementById("confirmNo").onclick = () => confirmModal.style.display = "none";

document.getElementById("confirmYes").onclick = async () => {
  confirmModal.style.display = "none";
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
      if (navigator.vibrate) navigator.vibrate(30);
      alert("Prenotazione registrata con successo!");
      window.location.reload(); 
    } else {
      alert("Errore durante il salvataggio: " + r.error);
    }
  } catch (e) {
    alert("Errore di rete durante l'invio");
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
  container.innerHTML = "<div style='text-align:center; opacity:0.6; padding:20px;'>Aggiornamento in corso...</div>";
  
  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    renderRiepilogo(bookings);
  } catch (e) {
    container.innerHTML = "<div style='text-align:center; color:red;'>Errore nel caricamento del riepilogo</div>";
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
    
    // Ordina le card della giornata per orario di inizio
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

  container.innerHTML = html || "<div style='text-align:center; opacity:0.5; padding:20px;'>Nessuna prenotazione trovata</div>";
}

function formattaData(isoDate) {
  const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const [y, m, d] = isoDate.split("-");
  return `${parseInt(d)} ${mesi[parseInt(m) - 1]} ${y}`;
}

/* =====================================================
   INIZIALIZZAZIONE
===================================================== */
window.addEventListener("load", () => {
  // Imposta la data minima nel selettore del browser (impedisce selezione visiva di date passate)
  const oggiStr = new Date().toISOString().split("T")[0];
  document.getElementById("date").setAttribute("min", oggiStr);

  // Popola menu postazioni
  const list = document.getElementById("postazioniList");
  list.innerHTML = POSTAZIONI.map(p => `
    <div style="padding: 3vw 0; border-bottom: 1px solid var(--ios-border);">
      <strong>${p.nome}</strong><br>
      <a href="${mapLink(p.lat, p.lon)}" target="_blank" style="color:var(--primary); font-size:3.8vw;">📍 Vedi posizione</a>
    </div>
  `).join("");

  document.getElementById("openPostazioni").onclick = () => 
    document.getElementById("postazioniMenu").classList.add("show");
  
  document.getElementById("closePostazioni").onclick = () => 
    document.getElementById("postazioniMenu").classList.remove("show");

  caricaRiepilogo();
});
