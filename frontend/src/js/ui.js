// Interface: navegação, toast, formatação, solução e recordes.

const screens = ["home", "rules", "records", "game", "performance"];

export function goto(name) {
  for (const s of screens) {
    document.getElementById(`screen-${s}`).classList.toggle("active", s === name);
  }
}

let toastTimer = null;
export function showToast(msg, ms = 2000) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), ms);
}

export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const COLOR_PT = {
  "red-car": "Vermelho", "blue-car": "Azul", "green-car": "Verde",
  "yellow-car": "Amarelo", "mint-car": "Verde-menta", "lilac-car": "Lilás",
  "brown-truck": "Marrom", "cyan-truck": "Ciano", "orange-truck": "Laranja",
  "pink-truck": "Rosa", "purple-truck": "Roxo",
};
const DIR_ARROW = { left: "⬅", right: "➡", up: "⬆", down: "⬇" };

// Dashboard do solver: nº mínimo + passo a passo (RF07)
export function renderSolution(sol) {
  document.getElementById("solve-moves").textContent = sol.moves;
  const ol = document.getElementById("solve-steps");
  ol.innerHTML = "";
  sol.steps.forEach((s, i) => {
    const li = document.createElement("li");
    li.className = "flex items-center gap-2 py-1.5 border-b border-slate-100";
    li.innerHTML = `
      <span class="text-slate-400 w-6 text-right">${i + 1}.</span>
      <span class="font-semibold">${COLOR_PT[s.color] || s.color}</span>
      <span class="text-lg leading-none">${DIR_ARROW[s.dir]}</span>
      <span class="text-slate-500">${s.count}x</span>`;
    ol.appendChild(li);
  });
}

// Tabela de recordes com pódio nos 3 primeiros (RF08) e botão "Detalhar"
export function renderRecords(records, onDetail) {
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
    const td = document.createElement("td");
    const btn = document.createElement("button");
    btn.className = "detail-btn";
    btn.textContent = "Detalhar";
    btn.addEventListener("click", () => onDetail(r));
    td.appendChild(btn);
    tr.appendChild(td);
    body.appendChild(tr);
  });
}
