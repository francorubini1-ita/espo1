const API = "https://script.google.com/macros/s/AKfycbw1PkamNFSLC_VTRaNZh8FVkYmqgGx2rTkWykn4bM5eMJeODC4bHMNo73UmoZyRpx5n/exec";

const POSTAZIONI = [
  { id: 1, nome: "Postazione 1", lat: 44.574728, lon: 11.363502 },
  { id: 2, nome: "Postazione 2", lat: 44.577320, lon: 11.361661 },
  { id: 3, nome: "Postazione 2bis", lat: 44.577225, lon: 11.358206 },
  { id: 4, nome: "Postazione 4", lat: 44.558822, lon: 11.355390 },
  { id: 5, nome: "Postazione 5", lat: 44.550000, lon: 11.350000 },
  { id: 6, nome: "Postazione 6", lat: 44.550000, lon: 11.350000 },
  { id: 7, nome: "Postazione 7", lat: 44.550000, lon: 11.350000 },
  { id: 8, nome: "Postazione 8", lat: 44.550000, lon: 11.350000 }
];

function mapLink(lat, lon) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

document.getElementById("check").onclick = async () => {
  const espositore = document.getElementById("espositore").value;
  const dateVal = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  document.querySelectorAll(".field-label").forEach(l => l.classList.remove("label-error"));

  if (!dateVal || !start || !end) return alert("Inserisci tutti i dati temporali.");

  const oraAttuale = new Date();
  const dataScelta = new Date(dateVal);
  dataScelta.setHours(0,0,0,0);
  const oggiStr = oraAttuale.toISOString().split("T")[0];
  const oraCorrenteStr = oraAttuale.getHours().toString().padStart(2, '0') + ":" + oraAttuale.getMinutes().toString().padStart(2, '0');

  // Controllo Data Passata
  if (dataScelta < new Date().setHours(0,0,0,0)) {
    document.querySelector("label[for='date']").classList.add("label-error");
    return alert("Non puoi prenotare una data nel passato.");
  }

  // Controllo Orario Passato (se oggi)
  if (dateVal === oggiStr && start < oraCorrenteStr) {
    document.querySelector("label[for='start']").classList.add("label-error");
    return alert(`L'orario di inizio (${start}) è già passato. Adesso sono le ${oraCorrenteStr}.`);
  }

  if (start >= end) {
    document.querySelector("label[for='start']").classList.add("label-error");
    document.querySelector("label[for='end']").classList.add("label-error");
    return alert("L'orario di fine deve essere dopo l'inizio.");
  }

  const checkingOverlay = document.getElementById("checkingOverlay");
  checkingOverlay.style.display = "flex";

  try {
    const res = await fetch(`${API}?action=check&date=${dateVal}&start=${start}&end=${end}&espositore=${espositore}`);
    const data = await res.json();
    checkingOverlay.style.display = "none";

    if (data.ok) {
      alert(`✅ Espositore ${espositore} LIBERO!`);
      document.getElementById("send").disabled = false;
    } else {
      alert(`❌ Occupato su Espositore ${espositore} da: ${data.with[0].name}`);
      document.getElementById("send").disabled = true;
    }
  } catch (e) { 
    checkingOverlay.style.display = "none";
    alert("Errore server."); 
  }
};

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
    <div style="line-height:1.6; font-size:22px;">
      <b>Espositore:</b> ${payload.espositore}<br>
      <b>Data:</b> ${payload.date.split("-").reverse().join("/")}<br>
      <b>Orario:</b> ${payload.start} - ${payload.end}<br>
      <b>Nome:</b> ${payload.name}
    </div>
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
  } catch (e) { alert("Errore invio."); }
  finally { document.getElementById("loadingOverlay").style.display = "none"; }
};

document.getElementById("confirmNo").onclick = () => document.getElementById("confirmModal").style.display = "none";

async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  container.innerHTML = "<p style='text-align:center; padding:30px;'>🔄 Sincronizzazione in corso...</p>";

  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
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
        const badgeClass = b.espositore === 'B' ? 'badge-b' : 'badge-a';
        html += `
          <div class="booking-card">
            <div style="flex: 1; min-width: 0;">
              <strong style="font-size:24px; display:block; margin-bottom:4px;">${b.name}</strong>
              <span style="font-size:19px; opacity:0.8; white-space: nowrap;">Post. ${b.postazione} | 🕒 ${b.start}-${b.end}</span>
            </div>
            <div class="badge ${badgeClass}">Esp.<span>${b.espositore || 'A'}</span></div>
          </div>`;
      });
    });
    container.innerHTML = html || "<p style='text-align:center;'>Nessuna prenotazione trovata.</p>";
  } catch (e) { container.innerHTML = "Errore durante il caricamento dei dati."; }
}

window.onload = () => {
  const oggi = new Date().toISOString().split("T")[0];
  const dateIn = document.getElementById("date");
  dateIn.value = oggi;
  dateIn.setAttribute("min", oggi);

  document.getElementById("openPostazioni").onclick = () => document.getElementById("postazioniMenu").classList.add("show");
  document.getElementById("closePostazioni").onclick = () => document.getElementById("postazioniMenu").classList.remove("show");

  document.getElementById("postazioniList").innerHTML = POSTAZIONI.map(p => `
    <div style="padding:18px 0; border-bottom:1px solid var(--ios-border);">
      <strong style="font-size:22px;">${p.nome}</strong><br>
      <a href="http://googleusercontent.com/maps.google.com/maps?q=${p.lat},${p.lon}&z=20&t=k" target="_blank" style="color:var(--primary); font-size:20px; text-decoration:none;">📍 Apri Mappa GPS</a>
    </div>
  `).join("");

  caricaRiepilogo();
};





