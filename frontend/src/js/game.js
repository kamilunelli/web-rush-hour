// Núcleo do jogo: tabuleiro, arraste, colisão, cronômetro, vitória, score e solver.

import { VEHICLES_PATH, GRID, MAIN_COLOR } from "./config.js";
import { formatTime, showToast, renderSolution } from "./ui.js";
import { solve } from "./api.js";
import { getRecords, addRecord } from "./store.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAD = 0.94; // encolhe o sprite dentro da célula
const gridEl = document.getElementById("grid");

// Estado
let levels = [];
let level = null;
let vehicles = [];           // cópia mutável (com row/col/el)
let moves = 0;
let seconds = 0;
let timerId = null;
let solverUsed = false;      // RN05
let isTest = false;
let won = false;
let playing = false;         // trava o arraste durante a reprodução
let currentSolution = null;
let onRecordSaved = () => {};

const TEST_LEVEL = {
  numero: 0, // aparece como "Teste"
  optimal_moves: 2,
  vehicles: [
    { color: "red-car", orient: "H", len: 2, row: 2, col: 0 },
    { color: "green-car", orient: "V", len: 2, row: 1, col: 3 },
  ],
};

export function setLevels(data) {
  levels = data;
}
export function setOnRecordSaved(cb) {
  onRecordSaved = cb;
}

// Entradas públicas
export function enterLevel(numero) {
  const lv = levels.find((l) => l.numero === numero);
  if (lv) loadLevel(lv, false);
}
export function enterTestLevel() {
  loadLevel(TEST_LEVEL, true);
}
export function currentNumero() {
  return level ? level.numero : null;
}
export function hasLevel(numero) {
  return levels.some((l) => l.numero === numero);
}
export function playAgain() {
  loadLevel(level, isTest);
}
export function restart() {
  loadLevel(level, isTest);
}

function loadLevel(lvObj, test) {
  level = lvObj;
  isTest = test;
  vehicles = level.vehicles.map((v) => ({ ...v })); // não altera o original
  moves = 0;
  seconds = 0;
  won = false;
  solverUsed = false;

  document.getElementById("hud-level").textContent = test ? "Teste" : level.numero;
  document.getElementById("hud-moves").textContent = "0";
  document.getElementById("hud-time").textContent = "00:00";
  hideModal();
  renderBoard();
  startTimer();
}

// Cronômetro
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

// Renderização
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

function positionAll() {
  const c = cellSize();
  for (const v of vehicles) positionVehicle(v, c);
}

function positionVehicle(v, c = cellSize()) {
  const boxW = (v.orient === "H" ? v.len : 1) * c;
  const boxH = (v.orient === "H" ? 1 : v.len) * c;

  v.el.style.left = `${v.col * c}px`;
  v.el.style.top = `${v.row * c}px`;
  v.el.style.width = `${boxW}px`;
  v.el.style.height = `${boxH}px`;

  // sprite é horizontal; se vertical, gira 90° (por isso troca W/H da imagem)
  if (v.orient === "V") {
    v.img.style.width = `${boxH * PAD}px`;
    v.img.style.height = `${boxW * PAD}px`;
  } else {
    v.img.style.width = `${boxW * PAD}px`;
    v.img.style.height = `${boxH * PAD}px`;
  }
}

window.addEventListener("resize", () => {
  if (vehicles.length) positionAll();
});

// Colisão: até onde o veículo pode ir no eixo (RN01/RN02)
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

function freeRange(v) {
  const grid = occupancyExcept(v);
  if (v.orient === "H") {
    let min = v.col;
    while (min - 1 >= 0 && !grid[v.row][min - 1]) min--;
    let end = v.col + v.len - 1;
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

// Arraste (pointer events: mouse + toque)
function attachDrag(v) {
  v.el.addEventListener("pointerdown", (e) => {
    if (won || playing) return;
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
      let pos = startPos + (pointer - startPointer) / c;
      pos = Math.max(minPos, Math.min(maxPos, pos)); // trava nos limites
      if (horizontal) v.el.style.left = `${pos * c}px`;
      else v.el.style.top = `${pos * c}px`;
    };

    const onUp = (ev) => {
      v.el.releasePointerCapture(e.pointerId);
      v.el.removeEventListener("pointermove", onMove);
      v.el.removeEventListener("pointerup", onUp);
      v.el.classList.remove("is-dragging");

      const pointer = horizontal ? ev.clientX : ev.clientY;
      let pos = Math.round(startPos + (pointer - startPointer) / c);
      pos = Math.max(minPos, Math.min(maxPos, pos));

      const moved = pos !== startPos;
      if (horizontal) v.col = pos; else v.row = pos;

      v.el.classList.add("animate");
      positionVehicle(v, c);

      if (moved) { // arrastar N casas = 1 movimento (RN04)
        moves++;
        document.getElementById("hud-moves").textContent = moves;
        checkWin();
      }
    };

    v.el.addEventListener("pointermove", onMove);
    v.el.addEventListener("pointerup", onUp);
  });
}

// Vitória: vermelho ocupando as colunas 4 e 5 da linha 2 (RN03)
function checkWin() {
  const main = vehicles.find((v) => v.color === MAIN_COLOR);
  if (main.row === 2 && main.col === GRID - 2) {
    won = true;
    stopTimer();
    main.el.classList.add("animate");
    main.el.style.left = `${(GRID + 0.5) * cellSize()}px`; // sai pela direita
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

  const msgEl = document.getElementById("modal-message");

  if (solverUsed) { // RN05
    msgEl.textContent = "Nível concluído com o Resolver.";
    noteEl.textContent = "Partida com ajuda do Resolver não entra nos recordes.";
    noteEl.classList.remove("hidden");
  } else {
    msgEl.textContent = "Parabéns, você completou o nível.";
    const best = getRecords(1)[0]?.score ?? -1;
    addRecord({ level_numero: level.numero, time_seconds: seconds, moves, score });
    if (score > best) recordEl.classList.remove("hidden");
    onRecordSaved();
  }
  showModal();
}

// Score (RN06): penaliza movimentos acima do ótimo e o tempo
function computeScore(moves, timeSeconds, optimal) {
  const BASE = 10000;
  const penaltyMoves = Math.max(0, moves - optimal) * 100;
  const penaltyTime = timeSeconds * 15;
  return Math.max(100, BASE - penaltyMoves - penaltyTime);
}

// Modais
function showModal() {
  document.getElementById("modal").classList.replace("hidden", "flex");
}
function hideModal() {
  const m = document.getElementById("modal");
  m.classList.add("hidden");
  m.classList.remove("flex");
}

export function exitToMenu() {
  stopTimer();
  won = true;
  hideModal();
}

// Resolver (A*): RF06 pausa, RN05 invalida recorde, RN07 usa o estado original
export async function onSolveClick() {
  if (!level || won || playing) return;
  solverUsed = true;
  stopTimer();
  try {
    const sol = await solve(level.vehicles); // estado original (RN07)
    currentSolution = sol;
    renderSolution(sol); // RF07
    showSolveModal();
  } catch (err) {
    showToast("Não foi possível resolver (API offline?).");
  }
}

// Reproduz a solução no tabuleiro, do estado inicial até a saída
export async function playSolution() {
  if (!currentSolution) return;
  hideSolveModal();
  playing = true;
  won = false;

  vehicles = level.vehicles.map((v) => ({ ...v }));
  renderBoard();
  moves = 0;
  document.getElementById("hud-moves").textContent = "0";
  await sleep(450);

  for (const s of currentSolution.steps) {
    const v = vehicles.find((x) => x.color === s.color);
    if (s.dir === "right") v.col += s.count;
    else if (s.dir === "left") v.col -= s.count;
    else if (s.dir === "down") v.row += s.count;
    else if (s.dir === "up") v.row -= s.count;
    v.el.classList.add("animate");
    positionVehicle(v);
    moves++;
    document.getElementById("hud-moves").textContent = moves;
    await sleep(550);
  }

  const main = vehicles.find((v) => v.color === MAIN_COLOR);
  main.el.classList.add("animate");
  main.el.style.left = `${(GRID + 0.5) * cellSize()}px`;
  await sleep(500);

  playing = false;
  won = true;
  finishGame();
}

export function closeSolve() {
  hideSolveModal();
}

function showSolveModal() {
  document.getElementById("solve-modal").classList.replace("hidden", "flex");
}
function hideSolveModal() {
  const m = document.getElementById("solve-modal");
  m.classList.add("hidden");
  m.classList.remove("flex");
}
