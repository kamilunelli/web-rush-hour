// Lógica principal do jogo: tabuleiro, arrastar veículos, colisão,
// cronômetro, movimentos, vitória, score e modal.

import { VEHICLES_PATH, GRID, MAIN_COLOR } from "./config.js";
import { formatTime, showToast, goto } from "./ui.js";
import { postRecord, getRecords } from "./api.js";

const PAD = 0.94;            // encolhe um pouco o sprite dentro da célula
const gridEl = document.getElementById("grid");

// ---------- Estado ----------
let levels = [];             // os 10 níveis vindos da API
let queue = [];              // fila embaralhada (níveis sem repetir)
let level = null;            // nível atual { numero, optimal_moves, vehicles }
let vehicles = [];           // cópia mutável dos veículos (com row/col/el)
let moves = 0;
let seconds = 0;
let timerId = null;
let solverUsed = false;      // RN05: se usar "Resolver", não salva recorde
let won = false;

// callback para atualizar a lista de recordes na tela de Recordes
let onRecordSaved = () => {};

export function setLevels(data) {
  levels = data;
}
export function setOnRecordSaved(cb) {
  onRecordSaved = cb;
}

// ---------- Fila de níveis (aleatório, sem repetir) ----------
function reshuffle() {
  queue = levels.map((_, i) => i);
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
}
function nextIndex() {
  if (queue.length === 0) reshuffle();
  return queue.shift();
}

// ---------- Entrada pública ----------
/** Chamado ao entrar na tela de jogo (botão JOGAR). */
export function enterGame() {
  if (!levels.length) {
    showToast("Carregando níveis...");
    return;
  }
  loadLevelByIndex(nextIndex());
}
export function playNext() {
  loadLevelByIndex(nextIndex());
}
export function playAgain() {
  const idx = levels.findIndex((l) => l.numero === level.numero);
  loadLevelByIndex(idx);
}
export function restart() {
  const idx = levels.findIndex((l) => l.numero === level.numero);
  loadLevelByIndex(idx);
}

// ---------- Carregar um nível ----------
function loadLevelByIndex(idx) {
  level = levels[idx];
  // cópia profunda dos veículos (para não alterar o original)
  vehicles = level.vehicles.map((v) => ({ ...v }));
  moves = 0;
  seconds = 0;
  won = false;
  solverUsed = false;

  document.getElementById("hud-level").textContent = level.numero;
  document.getElementById("hud-moves").textContent = "0";
  document.getElementById("hud-time").textContent = "00:00";
  hideModal();

  renderBoard();
  startTimer();
}

// ---------- Cronômetro ----------
function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    seconds++;
    document.getElementById("hud-time").textContent = formatTime(seconds);
  }, 1000);
}
function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

// ---------- Renderização ----------
function cellSize() {
  return gridEl.clientWidth / GRID;
}

function renderBoard() {
  gridEl.innerHTML = "";
  for (const v of vehicles) {
    const el = document.createElement("div");
    el.className = "vehicle" + (v.orient === "V" ? " v" : "");
    if (v.color === MAIN_COLOR) el.classList.add("main");

    const img = document.createElement("img");
    img.src = `${VEHICLES_PATH}/${v.color}.png`;
    img.alt = v.color;
    el.appendChild(img);

    v.el = el;
    v.img = img;
    gridEl.appendChild(el);
    attachDrag(v);
  }
  positionAll();
}

/** Posiciona todos os veículos (em pixels) — chamado ao render e no resize. */
function positionAll() {
  const c = cellSize();
  for (const v of vehicles) positionVehicle(v, c);
}

function positionVehicle(v, c = cellSize()) {
  const wCells = v.orient === "H" ? v.len : 1;
  const hCells = v.orient === "H" ? 1 : v.len;
  const boxW = wCells * c;
  const boxH = hCells * c;

  v.el.style.left = `${v.col * c}px`;
  v.el.style.top = `${v.row * c}px`;
  v.el.style.width = `${boxW}px`;
  v.el.style.height = `${boxH}px`;

  // O sprite é sempre horizontal; se o veículo é vertical, giramos 90°
  // (por isso trocamos largura/altura da imagem).
  if (v.orient === "V") {
    v.img.style.width = `${boxH * PAD}px`;
    v.img.style.height = `${boxW * PAD}px`;
  } else {
    v.img.style.width = `${boxW * PAD}px`;
    v.img.style.height = `${boxH * PAD}px`;
  }
}

// Reposiciona ao redimensionar a janela.
window.addEventListener("resize", () => {
  if (vehicles.length) positionAll();
});

// ---------- Colisão: alcance livre do veículo ----------
function occupancyExcept(target) {
  const grid = Array.from({ length: GRID }, () => Array(GRID).fill(false));
  for (const v of vehicles) {
    if (v === target) continue;
    for (let i = 0; i < v.len; i++) {
      const r = v.orient === "H" ? v.row : v.row + i;
      const col = v.orient === "H" ? v.col + i : v.col;
      grid[r][col] = true;
    }
  }
  return grid;
}

/** Retorna [minPos, maxPos] que a coordenada (col p/ H, row p/ V) pode assumir. */
function freeRange(v) {
  const grid = occupancyExcept(v);
  if (v.orient === "H") {
    let min = v.col;
    while (min - 1 >= 0 && !grid[v.row][min - 1]) min--;
    let end = v.col + v.len - 1; // célula mais à direita
    while (end + 1 < GRID && !grid[v.row][end + 1]) end++;
    return [min, end - v.len + 1];
  } else {
    let min = v.row;
    while (min - 1 >= 0 && !grid[min - 1][v.col]) min--;
    let end = v.row + v.len - 1;
    while (end + 1 < GRID && !grid[end + 1][v.col]) end++;
    return [min, end - v.len + 1];
  }
}

// ---------- Arrastar (pointer events: mouse + toque) ----------
function attachDrag(v) {
  v.el.addEventListener("pointerdown", (e) => {
    if (won) return;
    e.preventDefault();
    v.el.setPointerCapture(e.pointerId);
    v.el.classList.add("is-dragging");
    v.el.classList.remove("animate");

    const c = cellSize();
    const horizontal = v.orient === "H";
    const startPointer = horizontal ? e.clientX : e.clientY;
    const startPos = horizontal ? v.col : v.row;
    const [minPos, maxPos] = freeRange(v);

    const onMove = (ev) => {
      const pointer = horizontal ? ev.clientX : ev.clientY;
      const deltaCells = (pointer - startPointer) / c;
      let pos = startPos + deltaCells;
      pos = Math.max(minPos, Math.min(maxPos, pos)); // trava nos limites livres
      if (horizontal) v.el.style.left = `${pos * c}px`;
      else v.el.style.top = `${pos * c}px`;
    };

    const onUp = (ev) => {
      v.el.releasePointerCapture(e.pointerId);
      v.el.removeEventListener("pointermove", onMove);
      v.el.removeEventListener("pointerup", onUp);
      v.el.classList.remove("is-dragging");

      const pointer = horizontal ? ev.clientX : ev.clientY;
      const deltaCells = (pointer - startPointer) / c;
      let pos = Math.round(startPos + deltaCells);
      pos = Math.max(minPos, Math.min(maxPos, pos));

      const moved = pos !== startPos;
      if (horizontal) v.col = pos; else v.row = pos;

      v.el.classList.add("animate");
      positionVehicle(v, c);

      if (moved) {
        moves++;
        document.getElementById("hud-moves").textContent = moves;
        checkWin(v);
      }
    };

    v.el.addEventListener("pointermove", onMove);
    v.el.addEventListener("pointerup", onUp);
  });
}

// ---------- Vitória (RN03: extremidade direita do vermelho na col 5) ----------
function checkWin(movedVehicle) {
  const main = vehicles.find((v) => v.color === MAIN_COLOR);
  if (main.row === 2 && main.col === GRID - 2) {
    won = true;
    stopTimer();
    // anima o carro saindo pela direita
    const c = cellSize();
    main.el.classList.add("animate");
    main.el.style.left = `${(GRID + 0.5) * c}px`;
    setTimeout(finishGame, 350);
  }
}

async function finishGame() {
  const score = computeScore(moves, seconds, level.optimal_moves);

  document.getElementById("modal-time").textContent = formatTime(seconds);
  document.getElementById("modal-moves").textContent = moves;
  document.getElementById("modal-score").textContent = score;

  const recordEl = document.getElementById("modal-record");
  const noteEl = document.getElementById("modal-note");
  recordEl.classList.add("hidden");
  noteEl.classList.add("hidden");

  if (solverUsed) {
    // RN05: partida com "Resolver" não entra no ranking.
    noteEl.textContent = "Partida com ajuda do Resolver não entra nos recordes.";
    noteEl.classList.remove("hidden");
  } else {
    try {
      const before = await getRecords(1);
      const best = before.length ? before[0].score : -1;
      await postRecord({
        level_numero: level.numero,
        time_seconds: seconds,
        moves,
        score,
      });
      if (score > best) recordEl.classList.remove("hidden");
      onRecordSaved(); // atualiza a lista de recordes
    } catch (err) {
      noteEl.textContent = "Não foi possível salvar o recorde (API offline?).";
      noteEl.classList.remove("hidden");
    }
  }

  showModal();
}

// ---------- Score (RN06) ----------
// Recompensa poucos movimentos e pouco tempo; penaliza movimentos acima
// do ótimo do A* e o tempo gasto.
function computeScore(moves, timeSeconds, optimal) {
  const BASE = 10000;
  const penaltyMoves = Math.max(0, moves - optimal) * 100;
  const penaltyTime = timeSeconds * 15;
  return Math.max(100, BASE - penaltyMoves - penaltyTime);
}

// ---------- Modal ----------
function showModal() {
  const m = document.getElementById("modal");
  m.classList.remove("hidden");
  m.classList.add("flex");
}
function hideModal() {
  const m = document.getElementById("modal");
  m.classList.add("hidden");
  m.classList.remove("flex");
}

// ---------- Botão Resolver (inerte por enquanto) ----------
export function onSolveClick() {
  // O solver A* será implementado depois. Por ora, só avisa.
  showToast("Solver em desenvolvimento 🚧");
}
