const API = "https://script.google.com/macros/s/AKfycbw1PkamNFSLC_VTRaNZh8FVkYmqgGx2rTkWykn4bM5eMJeODC4bHMNo73UmoZyRpx5n/exec";

const POSTAZIONI = [
  { id: 1, nome: "Postazione 1", lat: 44.574728, lon: 11.363502 },
  { id: 2, nome: "Postazione 2", lat: 44.577320, lon: 11.361661 },
  { id: 3, nome: "Postazione 3", lat: 44.577225, lon: 11.358206 },
  { id: 4, nome: "Postazione 4", lat: 44.558822, lon: 11.355390 },
  { id: 5, nome: "Postazione 5", lat: 44.560000, lon: 11.350000 },
  { id: 6, nome: "Postazione 6", lat: 44.561000, lon: 11.351000 },
  { id: 7, nome: "Postazione 7", lat: 44.562000, lon: 11.352000 },
  { id: 8, nome: "Postazione 8", lat: 44.563000, lon: 11.353000 }
];

function resetUI() {
  document.getElementById("detailsPanel").style.display = "none";
  document.getElementById("suggestions").style.display = "none";
  document.getElementById("send").disabled = true;
  document.querySelectorAll(".field-label").forEach(l => l.classList.remove("label-error"));
}

document.getElementById("check").onclick = async () => {
  const espositore = document.getElementById("espositore").value;
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  resetUI();

  if (!date || !start || !end) {
    alert("Dati incompleti! Assicurati di aver inserito data e orario.");
    return;
  }

  if (start >= end) {
    document.querySelector("label[for='start']").classList.add("label-error");
    document.querySelector("label[for='end']").classList.add("label-error");
    alert("L'orario di inizio deve precedere quello di fine.");
    return;
  }

  const status = document.getElementById("status");
  status.style.display = "block";
  document.getElementById("msg").textContent = "Controllo orari...";

  try {
    const res = await fetch(`${API}?action=check&date=${date}&start=${start}&end=${end}&espositore=${espositore}`);
    const data = await res.json();
    status.style.display = "none";

    if (data.ok) {
      alert(`✅ L'Espositore ${espositore} è disponibile!`);
      document.getElementById("send").disabled = false;
    } else {
      const panel = document.getElementById("detailsPanel");
      panel.style.display = "block";
      const conflitti = (data.with || []).map(c => `<li><strong>${c.name}</strong> (${c.start}-${c.end})</li>`).join("");
      panel.innerHTML = `<strong>Attenzione!</strong> Su Espositore ${espositore} c'è già una prenotazione:<ul>${conflitti}</ul>`;
      
      if (data.suggestions && data.suggestions.length > 0) {
        document.getElementById("suggestions").style.display = "block";
        document.getElementById("suggestList").innerHTML = data.suggestions.map(s => 
          `<span class="suggest-btn" onclick="applySuggest('${s.start}', '${s.end}')">${s.start} - ${s.end}</span>`
        ).join("");
      }
    }
  } catch (e) {
    status.style.display = "none";
    alert("Errore durante la verifica della disponibilità.");
  }
};

function applySuggest(s, e) {
  document.getElementById("start").value = s;
  document.getElementById("end").value = e;
  resetUI();
}

document.getElementById("send").onclick = () => {
  const name = document.getElementById("name").value.trim();
  if (name.length < 3) return alert("Inserisci un nome valido.");

  const payload = {
    action: "submit",
    espositore: document.getElementById("espositore").value,
    date: document.getElementById("date").value,
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    name: name,
    postazione: document.getElementById("postazione").value
  };

  document.getElementById("confirmText").innerHTML = `
    <strong>Prenotazione Espositore ${payload.espositore}</strong><br><br>
    📅 Data: ${payload.date.split("-").reverse().join("/")}<br>
    🕒 Orario: ${payload.start} - ${payload.end}<br>
    📍 Postazione: ${payload.postazione}
  `;
  document.getElementById("confirmModal").style.display = "flex";
  window.currentPayload = payload;
};

document.getElementById("confirmNo").onclick = () => document.getElementById("confirmModal").style.display = "none";

document.getElementById("confirmYes").onclick = async () => {
  document.getElementById("confirmModal").style.display = "none";
  document.getElementById("loadingOverlay").style.display = "flex";

  try {
    const res = await fetch(API, { method: "POST", body: JSON.stringify(window.currentPayload) });
    const result = await res.json();
    if (result.success) {
      alert("Prenotazione confermata!");
      window.location.reload();
    }
  } catch (e) {
    alert("Impossibile salvare la prenotazione.");
  } finally {
    document.getElementById("loadingOverlay").style.display = "none";
  }
};

async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  container.innerHTML = "<p style='text-align:center; padding: 20px; opacity: 0.5;'>Sincronizzazione in corso...</p>";
  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    
    bookings.sort((a,b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

    container.innerHTML = bookings.map(b => `
      <div class="booking-card">
        <span class="badge ${b.espositore === 'B' ? 'badge-b' : ''}">Espositore ${b.espositore || 'A'}</span>
        <div style="font-weight:700; font-size: 17px; margin-bottom:6px;">${b.name}</div>
        <div style="font-size:14px; color:var(--text-secondary); line-height: 1.4;">
          📍 Postazione ${b.postazione}<br>
          📅 ${b.date.split("-").reverse().join("/")} | 🕒 ${b.start} - ${b.end}
        </div>
      </div>
    `).join("");
    if (bookings.length === 0) container.innerHTML = "<p style='text-align:center; padding:20px; opacity:0.5;'>Nessun evento in programma.</p>";
  } catch (e) {
    container.innerHTML = "<p style='color:var(--error); text-align:center; padding:20px;'>Errore nel caricamento del riepilogo.</p>";
  }
}

window.onload = () => {
  const oggi = new Date().toISOString().split("T")[0];
  document.getElementById("date").value = oggi;
  document.getElementById("date").setAttribute("min", oggi);

  caricaRiepilogo();

  document.getElementById("openPostazioni").onclick = () => document.getElementById("postazioniMenu").classList.add("show");
  document.getElementById("closePostazioni").onclick = () => document.getElementById("postazioniMenu").classList.remove("show");

  const mapList = document.getElementById("postazioniList");
  mapList.innerHTML = POSTAZIONI.map(p => `
    <div style="padding:18px 0; border-bottom:1px solid var(--ios-border);">
      <div style="font-weight:700; margin-bottom:6px;">${p.nome}</div>
      <a href="https://www.google.com/maps?q=${p.lat},${p.lon}" target="_blank" style="color:var(--primary); text-decoration:none; font-size:14px; font-weight:600;">📍 Vedi posizione</a>
    </div>
  `).join("");
};


