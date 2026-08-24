// Utilitários de interface: navegação entre telas, toast, formatação e recordes.

const screens = ["home", "rules", "records", "game"];

/** Mostra uma tela e esconde as outras. */
export function goto(name) {
  for (const s of screens) {
    const el = document.getElementById(`screen-${s}`);
    el.classList.toggle("active", s === name);
  }
}

/** Toast rápido no rodapé. */
let toastTimer = null;
export function showToast(msg, ms = 2000) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), ms);
}

/** Segundos -> "mm:ss". */
export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Preenche a tabela de recordes (RF08). */
export function renderRecords(records) {
  const body = document.getElementById("records-body");
  const empty = document.getElementById("records-empty");
  body.innerHTML = "";

  if (!records.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  records.forEach((r, i) => {
    const data = new Date(r.played_at).toLocaleDateString("pt-BR");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 px-2 font-bold text-slate-400">${i + 1}º</td>
      <td class="py-2 px-2">${data}</td>
      <td class="py-2 px-2">${r.level_numero}</td>
      <td class="py-2 px-2">${formatTime(r.time_seconds)}</td>
      <td class="py-2 px-2">${r.moves}</td>
      <td class="py-2 px-2 font-bold text-sky-600">${r.score}</td>
    `;
    body.appendChild(tr);
  });
}
