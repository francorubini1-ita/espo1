/* =====================================================
   CONFIGURAZIONE
   ===================================================== */
const API = "https://script.google.com/macros/s/AKfycbw1PkamNFSLC_VTRaNZh8FVkYmqgGx2rTkWykn4bM5eMJeODC4bHMNo73UmoZyRpx5n/exec";

const POSTAZIONI = [
  { id: 1, nome: "Postazione 1", lat: 44.574728, lon: 11.363502 },
  { id: 2, nome: "Postazione 2", lat: 44.577320, lon: 11.361661 },
  { id: 3, nome: "Postazione 3", lat: 44.577225, lon: 11.358206 },
  { id: 4, nome: "Postazione 4", lat: 44.558822, lon: 11.355390 },
  { id: 5, nome: "Postazione 5", lat: 44.550000, lon: 11.350000 },
  { id: 6, nome: "Postazione 6", lat: 44.550000, lon: 11.350000 },
  { id: 7, nome: "Postazione 7", lat: 44.550000, lon: 11.350000 },
  { id: 8, nome: "Postazione 8", lat: 44.550000, lon: 11.350000 }
];

/* =====================================================
   VALIDAZIONI E CONTROLLO DISPONIBILITÀ
   ===================================================== */
document.getElementById("check").onclick = async () => {
  const espositore = document.getElementById("espositore").value;
  const dateVal = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  // 1. Reset Errori
  document.querySelectorAll(".field-label").forEach(l => l.classList.remove("label-error"));

  // 2. Controllo Campi Vuoti
  if (!dateVal || !start || !end) return alert("Inserisci tutti i dati temporali.");

  // 3. Controllo Retroattività
  const oggi = new Date().setHours(0,0,0,0);
  const scelta = new Date(dateVal).setHours(0,0,0,0);
  if (scelta < oggi) {
    document.querySelector("label[for='date']").classList.add("label-error");
    return alert("Non puoi prenotare una data nel passato...");
  }

  // 4. Controllo Coerenza Oraria (Fine > Inizio)
  if (start >= end) {
    document.querySelector("label[for='start']").classList.add("label-error");
    document.querySelector("label[for='end']").classList.add("label-error");
    return alert("L'orario di fine deve essere dopo l'inizio...");
  }

  // 5. Chiamata API per verifica disponibilità
  try {
    const res = await fetch(`${API}?action=check&date=${dateVal}&start=${start}&end=${end}&espositore=${espositore}`);
    const data = await res.json();

    if (data.ok) {
      alert(`✅ Espositore ${espositore} disponibile!`);
      document.getElementById("send").disabled = false;
    } else {
      alert(`❌ Occupato su Espositore ${espositore} da: ${data.with[0].name}`);
      document.getElementById("send").disabled = true;
    }
  } catch (e) { alert("Errore connessione server."); }
};

/* =====================================================
   LOGICA DI INVIO
   ===================================================== */
document.getElementById("send").onclick = () => {
  const payload = {
    action: "submit",
    espositore: document.getElementById("espositore").value,
    date: document.getElementById("date").value,
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    name: document.getElementById("name").value.trim(),
    postazione: document.getElementById("postazione").value
  };

  if (payload.name.length < 3) return alert("Inserisci il tuo nome.");

  document.getElementById("confirmText").innerHTML = `
    <b>Espositore:</b> ${payload.espositore}<br>
    <b>Data:</b> ${payload.date.split("-").reverse().join("/")}<br>
    <b>Orario:</b> ${payload.start} - ${payload.end}<br>
    <b>Nome:</b> ${payload.name}
  `;
  document.getElementById("confirmModal").style.display = "flex";
  window.currentBooking = payload;
};

document.getElementById("confirmYes").onclick = async () => {
  document.getElementById("confirmModal").style.display = "none";
  document.getElementById("loadingOverlay").style.display = "flex";

  try {
    const res = await fetch(API, { method: "POST", body: JSON.stringify(window.currentBooking) });
    const r = await res.json();
    if (r.success) {
      alert("Prenotazione salvata!");
      window.location.reload();
    }
  } catch (e) { alert("Errore di rete."); }
  finally { document.getElementById("loadingOverlay").style.display = "none"; }
};

document.getElementById("confirmNo").onclick = () => document.getElementById("confirmModal").style.display = "none";

/* =====================================================
   RIEPILOGO RAGGRUPPATO
   ===================================================== */
async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  container.innerHTML = "<p style='text-align:center; opacity:0.5;'>Sincronizzazione...</p>";

  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();

    // Raggruppamento per data
    const gruppi = {};
    bookings.forEach(b => {
      if (!gruppi[b.date]) gruppi[b.date] = [];
      gruppi[b.date].push(b);
    });

    let html = "";
    Object.keys(gruppi).sort().forEach(data => {
      const dFormattata = data.split("-").reverse().join("/");
      html += `<div class="date-group-header">${dFormattata}</div>`;
      
      gruppi[data].sort((a,b) => a.start.localeCompare(b.start)).forEach(b => {
        html += `
          <div class="booking-card">
            <div>
              <strong>${b.name}</strong><br>
              <span style="font-size:12px; opacity:0.7;">Postazione ${b.postazione} | ${b.start}-${b.end}</span>
            </div>
            <span class="badge ${b.espositore === 'B' ? 'badge-b' : ''}">Esp. ${b.espositore || 'A'}</span>
          </div>`;
      });
    });
    container.innerHTML = html || "<p style='text-align:center;'>Nessuna prenotazione.</p>";
  } catch (e) { container.innerHTML = "Errore dati."; }
}

/* =====================================================
   INIZIALIZZAZIONE
   ===================================================== */
window.onload = () => {
  const oggi = new Date().toISOString().split("T")[0];
  document.getElementById("date").value = oggi;
  document.getElementById("date").setAttribute("min", oggi);

  // Mappa
  document.getElementById("openPostazioni").onclick = () => document.getElementById("postazioniMenu").classList.add("show");
  document.getElementById("closePostazioni").onclick = () => document.getElementById("postazioniMenu").classList.remove("show");

  document.getElementById("postazioniList").innerHTML = POSTAZIONI.map(p => `
    <div style="padding:12px 0; border-bottom:1px solid var(--ios-border);">
      <strong>${p.nome}</strong><br>
      <a href="http://maps.google.com/maps?q=${p.lat},${p.lon}" target="_blank" style="color:var(--primary); font-size:13px;">📍 Apri Mappa</a>
    </div>
  `).join("");

  caricaRiepilogo();
};




