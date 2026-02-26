/* =====================================================
   URL DELLA WEB APP
===================================================== */
const API = "https://script.google.com/macros/s/AKfycbw1PkamNFSLC_VTRaNZh8FVkYmqgGx2rTkWykn4bM5eMJeODC4bHMNo73UmoZyRpx5n/exec";

/* =====================================================
   POSTAZIONI + LINK MAPPA
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

function mapLink(lat, lon) {
  return `https://www.google.com/maps/@${lat},${lon},20z/data=!3m1!1e3`;
}


/* =====================================================
   RIFERIMENTI AGLI ELEMENTI DEL DOM
===================================================== */
const checkBtn = document.getElementById("check");
const sendBtn = document.getElementById("send");
const statusBox = document.getElementById("status");
const icon = document.getElementById("icon");
const msg = document.getElementById("msg");
const detailsPanel = document.getElementById("detailsPanel");
const conflictList = document.getElementById("conflictList");
const suggestionsDiv = document.getElementById("suggestions");
const suggestList = document.getElementById("suggestList");
const confirmModal = document.getElementById("confirmModal");
const confirmText = document.getElementById("confirmText");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const loadingOverlay = document.getElementById("loadingOverlay");

/* =====================================================
   CONTROLLO ORARI (IN TEMPO REALE)
===================================================== */
const startInput = document.getElementById("start");
const endInput = document.getElementById("end");

function controllaOrari() {
  const start = startInput.value;
  const end = endInput.value;

  if (!start || !end) {
    endInput.classList.remove("input-error");
    return false;
  }

  if (end <= start) {
    endInput.classList.add("input-error");
    return true;
  }

  endInput.classList.remove("input-error");
  return false;
}

startInput.addEventListener("change", controllaOrari);
endInput.addEventListener("change", controllaOrari);



/* =====================================================
   FUNZIONE DI RESET UI
===================================================== */
function resetUI() {
  statusBox.classList.remove("show");
  icon.textContent = "";
  msg.textContent = "";

  detailsPanel.style.display = "none";
  suggestionsDiv.style.display = "none";
  conflictList.innerHTML = "";
  suggestList.innerHTML = "";

  confirmModal.style.display = "none";
  confirmYes.disabled = false;
  confirmYes.style.opacity = "1";

  loadingOverlay.classList.remove("show");
  loadingOverlay.style.display = "none";
  loadingOverlay.style.pointerEvents = "none";

  sendBtn.disabled = true;
}

/* =====================================================
   CONTROLLO DISPONIBILITÀ
===================================================== */
checkBtn.onclick = async () => {
  document.activeElement.blur();

  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  if (!date || !start || !end) {
    alert("Compila la data e gli orari");
    return;
  }

if (controllaOrari()) {
    alert("L'orario di fine deve essere successivo all'orario di inizio.");
    return;
  }

  resetUI();

  statusBox.classList.add("show");
  icon.textContent = "⏳";
  msg.textContent = "Controllo...";

  try {
    const res = await fetch(`${API}?action=check&date=${date}&start=${start}&end=${end}`);
    const data = await res.json();
    handleCheck(data);
  } catch (e) {
    icon.textContent = "⚠️";
    msg.textContent = "Errore server";

    setTimeout(() => statusBox.classList.remove("show"), 3000);
  }
};

/* =====================================================
   GESTIONE RISPOSTA CONTROLLO
===================================================== */
function handleCheck(res) {
  statusBox.classList.remove("show");

  if (!res || res.error) {
    icon.textContent = "⚠️";
    msg.textContent = res?.error || "Errore";
    sendBtn.disabled = true;
    return;
  }

  if (res.ok) {
    icon.textContent = "✅";
    msg.textContent = "Orario disponibile";
    sendBtn.disabled = false;
    return;
  }

  icon.textContent = "❌";
  msg.textContent = "Sovrapposizione";
  sendBtn.disabled = true;

  detailsPanel.style.display = "block";
  conflictList.innerHTML = "";

  (res.with || []).forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.name} — ${c.start}–${c.end}`;
    conflictList.appendChild(li);
  });

  suggestionsDiv.style.display = "block";
  suggestList.innerHTML = `
    <div style="
      font-size: 5vw;
      font-weight: 700;
      color: #ffcc00;
      margin-bottom: 4vw;
    ">
      Modifica il tuo orario di richiesta
    </div>

    <button id="backToForm" style="
      padding: 3vw 4vw;
      font-size: 4.2vw;
      font-weight: 600;
      border-radius: 12px;
      background: var(--primary);
      color: white;
      border: none;
      width: 100%;
      cursor: pointer;
    ">
      Ritorna alla prenotazione
    </button>
  `;

  const backBtn = document.getElementById("backToForm");
  if (backBtn) {
    backBtn.onclick = () => {
      suggestionsDiv.style.display = "none";
      detailsPanel.style.display = "none";

      document.getElementById("formContainer").scrollIntoView({
        behavior: "smooth"
      });
    };
  }
}

/* =====================================================
   INVIO PRENOTAZIONE (APERTURA MODALE)
===================================================== */
sendBtn.onclick = () => {
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const name = document.getElementById("name").value;
  const postazione = document.getElementById("postazione").value;

  confirmText.textContent =
    `${date.split("-").reverse().join("/")} ${start}–${end} — ${name} (Postazione ${postazione})`;

  confirmModal.style.display = "flex";

  setTimeout(() => {
    if (confirmModal.style.display === "flex") {
      confirmModal.style.display = "none";
    }
  }, 15000);
};

/* =====================================================
   CHIUSURA MODALE
===================================================== */
confirmNo.onclick = () => {
  confirmModal.style.display = "none";
};

/* =====================================================
   CONFERMA INVIO PRENOTAZIONE
===================================================== */
confirmYes.onclick = async () => {
  confirmYes.disabled = true;
  confirmYes.style.opacity = "0.5";
  confirmModal.style.display = "none";

  const data = {
    action: "submit",
    date: document.getElementById("date").value,
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    name: document.getElementById("name").value,
    postazione: document.getElementById("postazione").value
  };

  try {
    const res = await fetch(API, {
      method: "POST",
      body: JSON.stringify(data)
    });

    const r = await res.json();

    if (r.success) {
      if (navigator.vibrate) navigator.vibrate(30);

      loadingOverlay.style.display = "flex";
      loadingOverlay.style.pointerEvents = "auto";
      setTimeout(() => loadingOverlay.classList.add("show"), 20);

      setTimeout(() => {
        loadingOverlay.classList.remove("show");
        loadingOverlay.style.display = "none";
        loadingOverlay.style.pointerEvents = "none";
        window.location.reload();
      }, 3000);

      setTimeout(() => {
        loadingOverlay.classList.remove("show");
        loadingOverlay.style.display = "none";
        loadingOverlay.style.pointerEvents = "none";
      }, 7000);

    } else {
      alert("Errore: " + r.error);
      confirmYes.disabled = false;
      confirmYes.style.opacity = "1";
    }

  } catch (e) {
    alert("Errore di rete");
    confirmYes.disabled = false;
    confirmYes.style.opacity = "1";
  }
};

/* =====================================================
   EFFETTO RIPPLE + VIBRAZIONE
===================================================== */
document.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", function(e) {
    if (navigator.vibrate) navigator.vibrate(15);

    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    btn.style.setProperty("--ripple-x", `${x}px`);
    btn.style.setProperty("--ripple-y", `${y}px`);

    btn.classList.remove("ripple-active");

    setTimeout(() => btn.classList.add("ripple-active"), 10);
    setTimeout(() => btn.classList.remove("ripple-active"), 500);
  });
});

/* =====================================================
   MENU LATERALE POSTAZIONI
===================================================== */
window.addEventListener("load", () => {
  const menu = document.getElementById("postazioniMenu");
  const openBtn = document.getElementById("openPostazioni");
  const closeBtn = document.getElementById("closePostazioni");
  const list = document.getElementById("postazioniList");

  list.innerHTML = POSTAZIONI.map(p => `
    <div>
      <strong>${p.nome}</strong><br>
      <a href="${mapLink(p.lat, p.lon)}" target="_blank">Apri sulla mappa</a>
    </div>
  `).join("");

  openBtn.onclick = () => menu.classList.add("show");
  closeBtn.onclick = () => menu.classList.remove("show");
});

/* =====================================================
   SCROLL AUTOMATICO AL RIEPILOGO DOPO RELOAD
===================================================== */
window.addEventListener("load", () => {
  if (window.location.hash === "#riepilogo") {
    const section = document.getElementById("riepilogo");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  }
});

/* =====================================================
   RIEPILOGO — CARICAMENTO
===================================================== */
async function caricaRiepilogo() {
  try {
    const res = await fetch(API + "?action=list");

    if (!res.ok) {
      const text = await res.text();
      console.error("Errore HTTP:", res.status, text);
      document.getElementById("riepilogo").innerHTML =
        "<div style='font-size:4vw;color:#666;'>Errore nel caricamento</div>";
      return;
    }

    const bookings = await res.json();
    renderRiepilogo(bookings);

  } catch (err) {
    console.error("Errore fetch:", err);
    document.getElementById("riepilogo").innerHTML =
      "<div style='font-size:4vw;color:#666;'>Errore di connessione</div>";
  }
}

/* =====================================================
   RIEPILOGO — RENDER
===================================================== */
function renderRiepilogo(bookings) {
  const grouped = {};

  bookings.forEach(b => {
    if (!grouped[b.date]) grouped[b.date] = [];
    grouped[b.date].push(b);
  });

  const dates = Object.keys(grouped).sort();
  let html = "";

  dates.forEach(date => {
    html += `<h3>${formattaData(date)}</h3>`;

    grouped[date].sort((a, b) => a.start.localeCompare(b.start));

    grouped[date].forEach(b => {
      html += `
        <div class="booking">
          <strong>Post. ${b.postazione}</strong> - ${b.name}<br>
          dalle ${b.start} alle ${b.end}
        </div>
      `;
    });
  });

  document.getElementById("riepilogo").innerHTML = html;
}

/* =====================================================
   FORMATTA DATA
===================================================== */
function formattaData(d) {
  const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const [y, m, day] = d.split("-");
  return `${parseInt(day)} ${mesi[parseInt(m)-1]} ${y}`;
}

/* =====================================================
   CARICAMENTO AUTOMATICO RIEPILOGO
===================================================== */
window.addEventListener("load", () => {
  resetUI();
  caricaRiepilogo();
});
