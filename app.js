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
const detailsPanel = document.getElementById("detailsPanel");

/* =====================================================
   FUNZIONE RESET UI
===================================================== */
function resetUI() {
  statusBox.classList.remove("show");
  detailsPanel.style.display = "none";
  detailsPanel.innerHTML = ""; 
  sendBtn.disabled = true;
  
  document.querySelectorAll(".field-label").forEach(l => l.classList.remove("label-error"));
}

/* =====================================================
   CONTROLLO DISPONIBILITÀ (Asset Unico)
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

  if (!dateValue || !start || !end) {
    alert("Compila tutti i campi prima di controllare.");
    return;
  }

  const dataScelta = new Date(dateValue);
  const adesso = new Date();
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  if (dataScelta < oggi) {
    dateLabel.classList.add("label-error");
    alert("Non puoi prenotare una data passata.");
    return;
  }

  if (dataScelta.getTime() === oggi.getTime()) {
    const oraAttuale = adesso.getHours().toString().padStart(2, '0') + ":" + 
                       adesso.getMinutes().toString().padStart(2, '0');
    if (start < oraAttuale) {
      startLabel.classList.add("label-error");
      alert("L'orario di inizio selezionato è già passato.");
      return;
    }
  }

  if (start >= end) {
    startLabel.classList.add("label-error");
    endLabel.classList.add("label-error");
    alert("L'orario di fine deve essere successivo a quello di inizio.");
    return;
  }

  statusBox.classList.add("show");
  icon.textContent = "⏳";
  msg.textContent = "Verifica espositore...";

  try {
    const res = await fetch(`${API}?action=check&date=${dateValue}&start=${start}&end=${end}`);
    const data = await res.json();
    handleCheck(data);
  } catch (e) {
    icon.textContent = "⚠️";
    msg.textContent = "Errore server";
    setTimeout(resetUI, 3000);
  }
};

function handleCheck(res) {
  statusBox.classList.remove("show");
  
  if (res.ok) {
    alert("✅ L'espositore è libero! Puoi procedere.");
    sendBtn.disabled = false;
    detailsPanel.style.display = "none";
  } else {
    detailsPanel.style.display = "block";
    
    const conflittiHtml = (res.with || []).map(c => 
      `<li><strong>${c.name}</strong> (${c.start} - ${c.end})</li>`
    ).join("");

    detailsPanel.innerHTML = `
      <strong style="color:var(--error); display:block; margin-bottom:8px;">Conflitti trovati:</strong>
      <ul id="conflictList" style="margin:0; padding-left:20px;">${conflittiHtml}</ul>
    `;
    
    alert("❌ Espositore già occupato in questa fascia oraria.");
    sendBtn.disabled = true;
  }
}

/* =====================================================
   INVIO E CONFERMA
===================================================== */
sendBtn.onclick = () => {
  const name = document.getElementById("name").value.trim();
  if (name.length < 3) {
    alert("Inserisci un nome di almeno 3 caratteri.");
    return;
  }
  
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const postazione = document.getElementById("postazione").value;

  document.getElementById("confirmText").innerHTML = `
    <strong>Confermi la prenotazione?</strong><br><br>
    Giorno: ${date.split("-").reverse().join("/")}<br>
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
      alert("Prenotazione salvata!");
      window.location.reload(); 
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
