/* =====================================================
   CONFIGURAZIONE E URL API
   Indirizzo della Web App pubblicata su Google Apps Script
===================================================== */
const API = "https://script.google.com/macros/s/AKfycbw1PkamNFSLC_VTRaNZh8FVkYmqgGx2rTkWykn4bM5eMJeODC4bHMNo73UmoZyRpx5n/exec";

/* =====================================================
   DATABASE DELLE POSTAZIONI
   Coordinate per il link alle mappe e nomi delle postazioni
===================================================== */
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

/**
 * Genera il link per Google Maps
 * @param {number} lat - Latitudine
 * @param {number} lon - Longitudine
 */
function mapLink(lat, lon) {
  // Ritorna l'URL formattato per mostrare la posizione esatta con zoom 20x
  return `http://googleusercontent.com/maps.google.com/maps?q=${lat},${lon}&z=20&t=k`;
}

/* =====================================================
   RIFERIMENTI AGLI ELEMENTI DEL DOM (INTERFACCIA)
===================================================== */
const checkBtn = document.getElementById("check");
const sendBtn = document.getElementById("send");
const statusBox = document.getElementById("status");
const icon = document.getElementById("icon");
const msg = document.getElementById("msg");
const loadingOverlay = document.getElementById("loadingOverlay");
const confirmModal = document.getElementById("confirmModal");

/* =====================================================
   FUNZIONE DI RESET UI
   Ripristina lo stato iniziale dei pannelli e dei pulsanti
===================================================== */
function resetUI() {
  statusBox.classList.remove("show"); // Nasconde il popup di stato
  document.getElementById("detailsPanel").style.display = "none"; // Nasconde eventuali conflitti
  document.getElementById("suggestions").style.display = "none"; // Nasconde suggerimenti
  sendBtn.disabled = true; // Disabilita il tasto invio finché non viene fatto un nuovo controllo
}

/* =====================================================
   LOGICA DI CONTROLLO DISPONIBILITÀ
   Interroga il server per verificare se la fascia oraria è libera
===================================================== */
checkBtn.onclick = async () => {
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  // Validazione semplice: tutti i campi devono essere compilati
  if (!date || !start || !end) {
    alert("Per favore, compila data e orari prima di procedere.");
    return;
  }

  resetUI();
  statusBox.classList.add("show");
  icon.textContent = "⏳";
  msg.textContent = "Controllo in corso...";

  try {
    // Chiamata GET al server con i parametri della prenotazione
    const res = await fetch(`${API}?action=check&date=${date}&start=${start}&end=${end}`);
    const data = await res.json();
    handleCheck(data); // Gestisce la risposta del server
  } catch (e) {
    icon.textContent = "⚠️";
    msg.textContent = "Errore di connessione";
    setTimeout(resetUI, 3000);
  }
};

/**
 * Gestisce il risultato del controllo disponibilità
 * @param {Object} res - Risposta JSON dal server
 */
function handleCheck(res) {
  statusBox.classList.remove("show");

  if (res.ok) {
    // Se disponibile, abilita il pulsante di invio
    icon.textContent = "✅";
    msg.textContent = "Orario disponibile!";
    sendBtn.disabled = false;
  } else {
    // Se occupato, mostra i dettagli dei conflitti trovati
    icon.textContent = "❌";
    msg.textContent = "Orario occupato";
    document.getElementById("detailsPanel").style.display = "block";
    const list = document.getElementById("conflictList");
    // Popola la lista dei conflitti
    list.innerHTML = (res.with || []).map(c => `<li>${c.name}: ${c.start}-${c.end}</li>`).join("");
    sendBtn.disabled = true;
  }
}

/* =====================================================
   INVIO DELLA PRENOTAZIONE
===================================================== */
sendBtn.onclick = () => {
  const name = document.getElementById("name").value.trim();
  
  // Verifica che sia stato inserito un nome
  if (name.length < 2) {
    alert("Inserisci il tuo nome prima di inviare.");
    return;
  }
  
  // Mostra il riepilogo nella modale di conferma
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const post = document.getElementById("postazione").value;

  document.getElementById("confirmText").innerHTML = `
    <strong>Confermi la prenotazione?</strong><br>
    Data: ${date.split("-").reverse().join("/")}<br>
    Orario: ${start} - ${end}<br>
    Postazione: ${post}<br>
    Nome: ${name}
  `;
  confirmModal.style.display = "flex";
};

// Chiude la modale senza inviare
document.getElementById("confirmNo").onclick = () => confirmModal.style.display = "none";

// Conferma definitiva e invio dati via POST
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
      if (navigator.vibrate) navigator.vibrate(30); // Feedback tattile su smartphone
      alert("Prenotazione registrata!");
      window.location.reload(); // Ricarica la pagina per aggiornare la lista
    } else {
      alert("Errore: " + r.error);
    }
  } catch (e) {
    alert("Errore durante l'invio dei dati.");
  } finally {
    loadingOverlay.classList.remove("show");
    loadingOverlay.style.display = "none";
  }
};

/* =====================================================
   GESTIONE DEL RIEPILOGO (LOOK & FEEL IMMAGINE)
===================================================== */
async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  container.innerHTML = "<div style='text-align:center; opacity:0.6;'>Caricamento prenotazioni...</div>";
  
  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    renderRiepilogo(bookings); // Genera l'HTML delle card
  } catch (e) {
    container.innerHTML = "<div style='text-align:center; color:red;'>Errore caricamento riepilogo.</div>";
  }
}

/**
 * Renderizza le prenotazioni raggruppandole per data
 * @param {Array} bookings - Lista delle prenotazioni dal server
 */
function renderRiepilogo(bookings) {
  const container = document.getElementById("riepilogo");
  const grouped = {};

  // 1. Organizza le prenotazioni in un oggetto: { "2026-02-14": [booking1, booking2], ... }
  bookings.forEach(b => {
    if (!grouped[b.date]) grouped[b.date] = [];
    grouped[b.date].push(b);
  });

  // 2. Ordina le date in ordine cronologico
  const sortedDates = Object.keys(grouped).sort();
  let html = "";

  sortedDates.forEach(date => {
    // Aggiunge il titolo della data (es. 14 Feb 2026)
    html += `<h3 class="riepilogo-date">${formattaData(date)}</h3>`;

    // Ordina le prenotazioni della giornata per ora di inizio
    grouped[date].sort((a, b) => a.start.localeCompare(b.start));

    // 3. Genera le card per ogni prenotazione
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

  container.innerHTML = html || "<div style='text-align:center; opacity:0.5;'>Nessuna prenotazione presente.</div>";
}

/**
 * Converte una data ISO (YYYY-MM-DD) in formato leggibile (DD Mese YYYY)
 * @param {string} isoDate 
 */
function formattaData(isoDate) {
  const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const [y, m, d] = isoDate.split("-");
  return `${parseInt(d)} ${mesi[parseInt(m) - 1]} ${y}`;
}

/* =====================================================
   INIZIALIZZAZIONE AL CARICAMENTO DELLA PAGINA
===================================================== */
window.addEventListener("load", () => {
  // Popola la lista delle postazioni nel menu laterale
  const list = document.getElementById("postazioniList");
  list.innerHTML = POSTAZIONI.map(p => `
    <div style="padding: 10px 0; border-bottom: 1px solid #3a3a3c;">
      <strong>${p.nome}</strong><br>
      <a href="${mapLink(p.lat, p.lon)}" target="_blank" style="color:#007aff; font-size:14px;">📍 Vedi su Mappa</a>
    </div>
  `).join("");

  // Gestione apertura/chiusura menu postazioni
  document.getElementById("openPostazioni").onclick = () => 
    document.getElementById("postazioniMenu").classList.add("show");
  
  document.getElementById("closePostazioni").onclick = () => 
    document.getElementById("postazioniMenu").classList.remove("show");

  // Carica il riepilogo iniziale
  caricaRiepilogo();
});
