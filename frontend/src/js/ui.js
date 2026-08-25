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

  const medals = ["🥇", "🥈", "🥉"];
  records.forEach((r, i) => {
    const data = new Date(r.played_at).toLocaleDateString("pt-BR");
    const nivel = r.level_numero === 0 ? "Teste" : r.level_numero;
    const pos = i < 3 ? `${medals[i]} ${i + 1}º` : `${i + 1}º`;
    const tr = document.createElement("tr");
    if (i < 3) tr.className = `rank-${i + 1}`;
    tr.innerHTML = `
      <td class="font-bold text-slate-500">${pos}</td>
      <td>${data}</td>
      <td>${nivel}</td>
      <td>${formatTime(r.time_seconds)}</td>
      <td>${r.moves}</td>
      <td class="rec-score font-extrabold text-sky-600">${r.score}</td>
    `;
    body.appendChild(tr);
  });
}
