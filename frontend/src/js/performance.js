// Tela de desempenho: gráficos (SVG/CSS) detalhando um record.
import { formatTime } from "./ui.js";

// Barra vertical (rótulo + valor + altura proporcional).
function bar(label, value, max, color) {
  const h = Math.round((value / (max || 1)) * 100);
  return `
    <div class="flex flex-col items-center gap-1 flex-1">
      <span class="text-sm font-bold text-slate-600">${value}</span>
      <div class="w-10 bg-slate-100 rounded-t-lg flex items-end" style="height:120px">
        <div class="w-full ${color} rounded-t-lg" style="height:${h}%"></div>
      </div>
      <span class="text-xs text-slate-500 text-center">${label}</span>
    </div>`;
}

// Rosca (donut) mostrando uma porcentagem.
function donut(pct, color) {
  const C = 2 * Math.PI * 52;
  const off = C * (1 - pct / 100);
  return `
    <svg viewBox="0 0 120 120" class="w-36 h-36">
      <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" stroke-width="14"/>
      <circle cx="60" cy="60" r="52" fill="none" stroke="${color}" stroke-width="14"
        stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}"
        transform="rotate(-90 60 60)"/>
      <text x="60" y="68" text-anchor="middle" font-size="26" font-weight="800" fill="#334155">${pct}%</text>
    </svg>`;
}

function card(title, inner) {
  return `
    <div class="bg-white rounded-2xl shadow p-5">
      <h3 class="font-bold text-slate-700 mb-4">${title}</h3>
      ${inner}
    </div>`;
}

function stat(label, value) {
  return `
    <div class="bg-white rounded-2xl shadow px-4 py-3 text-center">
      <div class="text-xs text-slate-400 uppercase tracking-wide">${label}</div>
      <div class="text-lg font-extrabold text-slate-700">${value}</div>
    </div>`;
}

export function renderPerformance(rec, optimal, allRecords) {
  const el = document.getElementById("perf-content");

  const extra = Math.max(0, rec.moves - optimal);
  const penMoves = extra * 100;
  const penTime = rec.time_seconds * 15;
  const eff = optimal > 0 ? Math.min(100, Math.round((optimal / rec.moves) * 100)) : 100;
  const nivel = rec.level_numero === 0 ? "Teste" : rec.level_numero;
  const data = new Date(rec.played_at).toLocaleDateString("pt-BR");

  const scores = allRecords.map((r) => r.score);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));
  const best = Math.max(...scores, rec.score);

  // Composição do score (segmentos proporcionais)
  const total = rec.score + penMoves + penTime || 1;
  const seg = (v) => `${(v / total) * 100}%`;

  const maxMoves = Math.max(rec.moves, optimal, 1);
  const maxScore = Math.max(best, rec.score, 1);

  el.innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
      ${stat("Nível", nivel)}
      ${stat("Data", data)}
      ${stat("Tempo", formatTime(rec.time_seconds))}
      ${stat("Movimentos", rec.moves)}
      ${stat("Score", rec.score)}
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      ${card("Movimentos: você × ótimo (A*)", `
        <div class="flex items-end justify-center gap-8">
          ${bar("Ótimo", optimal, maxMoves, "bg-emerald-500")}
          ${bar("Você", rec.moves, maxMoves, "bg-sky-500")}
        </div>
        <p class="text-center text-sm text-slate-500 mt-3">
          ${extra === 0 ? "Solução perfeita! 🎯" : `${extra} movimento(s) acima do ótimo`}
        </p>`)}

      ${card("Eficiência de movimentos", `
        <div class="flex justify-center">${donut(eff, "#22c55e")}</div>
        <p class="text-center text-sm text-slate-500 mt-2">ótimo ÷ seus movimentos</p>`)}

      ${card("Composição do Score", `
        <div class="flex h-6 rounded-full overflow-hidden shadow-inner bg-slate-100">
          <div class="bg-emerald-500" style="width:${seg(rec.score)}"></div>
          <div class="bg-red-400" style="width:${seg(penMoves)}"></div>
          <div class="bg-amber-400" style="width:${seg(penTime)}"></div>
        </div>
        <ul class="mt-4 space-y-1 text-sm">
          <li class="flex justify-between"><span>🟩 Score final</span><b>${rec.score}</b></li>
          <li class="flex justify-between"><span>🟥 Penalidade por movimentos</span><b>−${penMoves}</b></li>
          <li class="flex justify-between"><span>🟧 Penalidade por tempo</span><b>−${penTime}</b></li>
          <li class="flex justify-between text-slate-400 border-t pt-1 mt-1"><span>Base</span><b>10000</b></li>
        </ul>`)}

      ${card("Seu score × média × melhor", `
        <div class="flex items-end justify-center gap-8">
          ${bar("Este", rec.score, maxScore, "bg-sky-500")}
          ${bar("Média", avg, maxScore, "bg-slate-400")}
          ${bar("Melhor", best, maxScore, "bg-amber-500")}
        </div>`)}
    </div>`;
}
