const API = "https://script.google.com/macros/s/AKfycbzHmkvVWE12RA3MFycv4Cak9SghvkGYJzImfICdG4nLSKby47SIwnZgzXpR3cnRZrTh/exec";

const POSTAZIONI = [
  { id: 1, nome: "Postazione 1", lat: 44.877242, lon: 11.858320 },  
  { id: 2, nome: "Postazione 2", lat: 44.577242, lon: 11.358320 },  
  { id: 3, nome: "Postazione 3", lat: 44.574934, lon: 11.356581 },
  { id: 4, nome: "Postazione 4", lat: 44.572196, lon: 11.360316 },  
  { id: 5, nome: "Postazione 5", lat: 44.575620, lon: 11.364312 },  
  { id: 6, nome: "Postazione 6", lat: 44.558823, lon: 11.355419 },  
  { id: 7, nome: "Postazione 7", lat: 44.571503, lon: 11.352728 },  
  { id: 8, nome: "Postazione 8", lat: 44.556829, lon: 11.319514 }
];

function mapLink(lat, lon) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

// Funzione globale per caricare il riepilogo
async function caricaRiepilogo() {
  const container = document.getElementById("riepilogo");
  if (!container) return;
  container.innerHTML = "<p style='text-align:center; padding:30px;'>🔄 Aggiornamento in corso...</p>";

  try {
    const res = await fetch(API + "?action=list");
    const bookings = await res.json();
    const gruppi = {};
    
    bookings.forEach(b => {
      // FIX DATA: Prendiamo solo i primi 10 caratteri (YYYY-MM-DD) 
      // Ignoriamo orari e fusi orari che causano il bug del giorno precedente
      let dataStringa = b.date.toString().substring(0, 10);
      
      if (!gruppi[dataStringa]) gruppi[dataStringa] = [];
      gruppi[dataStringa].push(b);
    });

    let html = "";
    // Ordiniamo le date in modo cronologico
    const dateOrdinate = Object.keys(gruppi).sort();

    dateOrdinate.forEach(dataKey => {
      // Formattiamo da YYYY-MM-DD a DD/MM/YYYY per il titolo
      const parti = dataKey.split("-");
      const dFormattata = parti.length === 3 ? `${parti[2]}/${parti[1]}/${parti[0]}` : dataKey;
      
      html += `<div class="date-group-header">${dFormattata}</div>`;
      
      gruppi[dataKey].sort((a,b) => a.start.localeCompare(b.start)).forEach(b => {
        let esp = "A";
        if (b.espositore) {
            let s = b.espositore.toString();
            esp = (s.includes("-") || s.includes("T")) ? "A" : s.trim().charAt(0).toUpperCase();
        }
        const badgeClass = esp === 'B' ? 'badge-b' : 'badge-a';
        
        html += `
          <div class="booking-card">
            <div style="flex: 1; min-width: 0;">
              <strong style="font-size:24px; display:block; margin-bottom:4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.name}</strong>
              <span style="font-size:19px; opacity:0.8;">Post. ${b.postazione} | 🕒 ${b.start}-${b.end}</span>
            </div>
            <div class="badge ${badgeClass}">Esp.<span>${esp}</span></div>
          </div>`;
      });
    });
    container.innerHTML = html || "<p style='text-align:center;'>Nessuna prenotazione trovata.</p>";
  } catch (e) { 
    container.innerHTML = "<p style='text-align:center;'>Errore caricamento dati.</p>"; 
  }
}

window.caricaRiepilogo = caricaRiepilogo;

document.getElementById("check").onclick = async () => {
  const espositore = document.getElementById("espositore").value;
  const dateVal = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  if (!dateVal || !start || !end) return alert("Inserisci i dati.");

  const checkingOverlay = document.getElementById("checkingOverlay");
  checkingOverlay.style.display = "flex";

  try {
    const res = await fetch(`${API}?action=check&date=${dateVal}&start=${start}&end=${end}&espositore=${espositore}`);
    const data = await res.json();
    checkingOverlay.style.display = "none";

    if (data.ok) {
      alert(`✅ Disponibile!`);
      document.getElementById("send").disabled = false;
    } else {
      alert(`❌ Occupato da: ${data.with[0].name}`);
      document.getElementById("send").disabled = true;
    }
  } catch (e) { 
    checkingOverlay.style.display = "none";
    alert("Errore server."); 
  }
};

document.getElementById("send").onclick = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const payload = {
    action: "submit",
    telegramId: urlParams.get('user'),
    espositore: document.getElementById("espositore").value,
    date: document.getElementById("date").value,
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    name: document.getElementById("name").value.trim(),
    postazione: document.getElementById("postazione").value
  };

  if (payload.name.length < 3) return alert("Inserisci il tuo nome.");

  const dConf = payload.date.split("-").reverse().join("/");
  document.getElementById("confirmText").innerHTML = `
    <b>Espositore:</b> ${payload.espositore}<br>
    <b>Data:</b> ${dConf}<br>
    <b>Orario:</b> ${payload.start} - ${payload.end}
  `;
  document.getElementById("confirmModal").style.display = "flex";
  window.currentBooking = payload;
};

document.getElementById("confirmYes").onclick = async () => {
  document.getElementById("confirmModal").style.display = "none";
  document.getElementById("loadingOverlay").style.display = "flex";
  try {
    await fetch(API, { method: "POST", body: JSON.stringify(window.currentBooking) });
    window.location.reload();
  } catch (e) { 
    alert("Errore invio."); 
    document.getElementById("loadingOverlay").style.display = "none";
  }
};

document.getElementById("confirmNo").onclick = () => document.getElementById("confirmModal").style.display = "none";

window.onload = () => {
  const oggi = new Date().toISOString().split("T")[0];
  if(document.getElementById("date")) document.getElementById("date").value = oggi;

  document.getElementById("openPostazioni").onclick = () => document.getElementById("postazioniMenu").classList.add("show");
  document.getElementById("closePostazioni").onclick = () => document.getElementById("postazioniMenu").classList.remove("show");

  const listContainer = document.getElementById("postazioniList");
  if(listContainer) {
    listContainer.innerHTML = POSTAZIONI.map(p => `
      <div style="padding:18px 0; border-bottom:1px solid var(--ios-border);">
        <strong style="font-size:22px;">${p.nome}</strong><br>
        <a href="${mapLink(p.lat, p.lon)}" target="_blank" style="color:var(--primary); font-size:20px; text-decoration:none;">📍 Apri Mappa GPS</a>
      </div>
    `).join("");
  }

  caricaRiepilogo();
};
