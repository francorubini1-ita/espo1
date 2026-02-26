/* =====================================================
   URL DELLA WEB APP
===================================================== */
const API = "https://script.google.com/macros/s/AKfycbw1PkamNFSLC_VTRaNZh8FVkYmqgGx2rTkWykn4bM5eMJeODC4bHMNo73UmoZyRpx5n/exec";

/* =====================================================
   RIFERIMENTI
===================================================== */
const checkBtn = document.getElementById("check");
const sendBtn = document.getElementById("send");
const startInput = document.getElementById("start");
const endInput = document.getElementById("end");

/* =====================================================
   CONTROLLO ORA FINE < ORA INIZIO (label rossa)
===================================================== */
function controllaOrari() {
  const start = startInput.value;
  const end = endInput.value;
  const labelEnd = document.getElementById("labelEnd");

  labelEnd.classList.remove("label-error");

  if (!start || !end) return false;

  if (end <= start) {
    labelEnd.classList.add("label-error");
    return true;
  }

  return false;
}

startInput.addEventListener("change", controllaOrari);
endInput.addEventListener("change", controllaOrari);

/* =====================================================
   CONTROLLO DATA < OGGI (label rossa)
===================================================== */
function controllaDataPassata() {
  const oggi = new Date();
  oggi.setHours(0,0,0,0);

  const date = document.getElementById("date").value;
  const labelDate = document.getElementById("labelDate");

  labelDate.classList.remove("label-error");

  if (!date) return false;

  const [y, m, d] = date.split("-");
  const dataSelezionata = new Date(y, m - 1, d);

  if (dataSelezionata < oggi) {
    labelDate.classList.add("label-error");
    return true;
  }

  return false;
}

document.getElementById("date").addEventListener("change", controllaDataPassata);

/* =====================================================
   CONTROLLO DISPONIBILITÀ
===================================================== */
checkBtn.onclick = () => {
  if (controllaDataPassata() || controllaOrari()) {
    alert("Controlla data e orari: ci sono errori.");
    return;
  }

  alert("Disponibilità OK (simulazione).");
};

/* =====================================================
   INVIO PRENOTAZIONE
===================================================== */
sendBtn.onclick = () => {
  if (controllaDataPassata() || controllaOrari()) {
    alert("Controlla data e orari: ci sono errori.");
    return;
  }

  alert("Prenotazione inviata (simulazione).");
};
