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

// Corretto il link mappa e rimosso lo 0 errato
function mapLink(lat, lon) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

const checkBtn = document.getElementById("check");
const sendBtn = document.getElementById("send");
const statusBox = document.getElementById("status");
const loadingOverlay = document.getElementById("loadingOverlay");

function resetUI() {
  statusBox.classList.remove("show");
  document.getElementById("detailsPanel").style.display = "none";
  document.getElementById("suggestions").style.display = "none";
  sendBtn.disabled = true;
}

// CONTROLLO DISPONIBILITÀ
checkBtn.onclick = async () => {
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  if (!date || !start || !end) {
    alert("Seleziona data e orari completi.");
    return;
  }

  resetUI();
  statusBox.classList.add("show");
  document.getElementById("msg").textContent = "Controllo in corso...";

  try {
    const res = await fetch(`${API}?action=check&date=${date}&start=${start}&end=${end}`);
    const data = await res.json();
    handleCheck(data);
  } catch (e) {
    document.getElementById("msg").textContent = "Errore di connessione";
    setTimeout(resetUI, 3000);
  }
};

function handleCheck(res) {
  statusBox.classList.remove("show");
  if (res.ok) {
    alert("✅ Orario disponibile! Ora inserisci il tuo nome e conferma.");
    sendBtn.disabled = false;
  } else {
    document.getElementById("detailsPanel").style.display = "block";
    const list = document.getElementById("conflictList");
    list.innerHTML = (res.with || []).map(c => `<li>${c.name}: ${c.start}-${c.end}</li>`).join("");
    sendBtn.disabled = true;
  }
}

// INVIO PRENOTAZIONE
sendBtn.onclick = () => {
  const name = document.getElementById("name").value.trim();
  if (name.length < 3) {
    alert("Inserisci un nome valido per continuare.");
    return;
  }
  
  const date = document.getElementById("date").value;
  const postazione = document.getElementById("postazione").value;
  
  document.getElementById("confirmText").innerHTML = `
    <strong>Data:</strong> ${date}<br>
    <strong>Postazione:</strong> ${postazione}<br>
    <strong>Nome:</strong> ${name}
  `;
  document.getElementById("confirmModal").style.display = "flex";
};

document.getElementById("confirmNo").onclick = () => {
  document.getElementById("confirmModal").style.display = "none";
};

document.getElementById("confirmYes").onclick = async () => {
  document.getElementById("confirmModal").style.display = "none";
  loadingOverlay.style.display = "flex";
  loadingOverlay.style.opacity = "1";

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
      location.reload(); // Semplice e pulito per resettare tutto
    } else {
      alert("Errore: " + r.error);
    }
  } catch (e) {
    alert("Errore di rete");
  } finally {
    loadingOverlay.style.display = "none";
  }
};

// GESTIONE RIEPILOGO
async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  container.innerHTML = "Caricamento...";
  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    
    let html = "";
    bookings.forEach(b => {
      html += `<div class="booking">
        <strong>${b.date}</strong> - Post. ${b.postazione}<br>
        ${b.start} / ${b.end} | <em>${b.name}</em>
      </div>`;
    });
    container.innerHTML = html || "Nessuna prenotazione presente.";
  } catch (e) {
    container.innerHTML = "Impossibile caricare il riepilogo.";
  }
}

// GESTIONE MENU LATERALE
document.getElementById("openPostazioni").onclick = () => {
  const list = document.getElementById("postazioniList");
  list.innerHTML = POSTAZIONI.map(p => `
    <div style="margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:5px;">
      <strong>${p.nome}</strong><br>
      <a href="${mapLink(p.lat, p.lon)}" target="_blank">📍 Vedi su Mappa</a>
    </div>
  `).join("");
  document.getElementById("postazioniMenu").classList.add("show");
};

document.getElementById("closePostazioni").onclick = () => {
  document.getElementById("postazioniMenu").classList.remove("show");
};

// Inizializzazione
window.onload = caricaRiepilogo;
