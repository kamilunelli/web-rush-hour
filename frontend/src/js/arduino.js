// Modo Arduino: conecta ao tabuleiro físico (Web Serial), lê o controle Xbox
// (Gamepad API), espelha o estado enviado pelo Arduino e executa a solução do
// A* (backend /solve) movendo os carros de verdade na matriz de LEDs.
//
// Protocolo (ver HoraDoRush.ino no repositório hardware-rush-hour):
//   site -> Arduino: A X Y (botões), D E W S (direita/esquerda/cima/baixo),
//                    L<n> (carregar nível), C<i> (selecionar carro i), Q (cancelar), ? (estado)
//   Arduino -> site: "@HELLO <versão> <níveis>"
//                    "@S <nível> <movs> <ótimo> <vitórias> <status> <atual> <selecionado> <carros...>"
//                    carro = 5 caracteres: linha, coluna, tamanho, H/V, cor (ex.: 202H0)

import { VEHICLES_PATH, GRID, MAIN_COLOR } from "./config.js";
import { solve } from "./api.js";
import { showToast, COLOR_PT, DIR_ARROW } from "./ui.js";

const BAUD = 115200; // igual ao Serial.begin() do Arduino
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// id de cor do Arduino -> sprite do jogo web (mesma cor nos LEDs e na tela)
const SPRITES = [
  "red-car", "blue-car", "green-car", "yellow-car",
  "purple-truck", "cyan-truck", "pink-truck", "orange-truck",
];

const LEVELS = [
  { numero: 1, label: "Tutorial", cls: "lvl-tutorial" },
  { numero: 2, label: "Fácil", cls: "lvl-easy" },
  { numero: 3, label: "Médio", cls: "lvl-medium" },
  { numero: 4, label: "Médio", cls: "lvl-medium" },
  { numero: 5, label: "Difícil", cls: "lvl-hard" },
  { numero: 6, label: "Difícil", cls: "lvl-hard" },
];

const STATUS = { IDLE: 0, PLAYING: 1, WON: 2, COMPLETED: 3 };
const DIR_CMD = { right: "D", left: "E", up: "W", down: "S" };
const PAD_CMD = { A: "A", X: "X", Y: "Y", UP: "W", DOWN: "S", LEFT: "E", RIGHT: "D" };

const $ = (id) => document.getElementById(id);

// Conexão
let port = null;
let writer = null;
let reader = null;
let readLoopDone = null;
let connected = false;

// Estado espelhado
let state = null;       // último @S recebido
let vehicleEls = [];    // elementos do tabuleiro, por índice do carro
let boardKey = "";      // muda quando o nível/carros mudam -> recria o tabuleiro

// Resolver
let playToken = 0;      // incrementa para abortar uma reprodução
let playing = false;

let active = false;     // tela do Modo Arduino aberta

// ---------------------------------------------------------------------------
// Inicialização da tela

export function init() {
  renderLevelButtons();
  $("ard-connect").addEventListener("click", () => (connected ? disconnect() : connect()));
  $("ard-restart").addEventListener("click", () => { stopPlayback(); send("Y"); });
  $("ard-cancel").addEventListener("click", cancel);
  $("ard-solve").addEventListener("click", () => runSolver(false));
  $("ard-hint").addEventListener("click", () => runSolver(true));
  window.addEventListener("resize", () => state && positionAll());
  window.addEventListener("keydown", onKey);

  if (!("serial" in navigator)) {
    $("ard-unsupported").classList.remove("hidden");
    $("ard-connect").disabled = true;
  } else {
    navigator.serial.addEventListener("disconnect", (e) => {
      if (e.target === port) handleLostConnection("Arduino desconectado.");
    });
  }
  requestAnimationFrame(pollGamepad);
  updateUi();
}

export function enter() {
  active = true;
  if (state) positionAll();
}

export function leave() {
  active = false;
  stopPlayback();
}

// ---------------------------------------------------------------------------
// Web Serial

async function connect() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: BAUD });
  } catch (err) {
    if (err.name !== "NotFoundError") showToast("Não foi possível abrir a porta: " + err.message, 4000);
    port = null;
    return;
  }
  writer = port.writable.getWriter();
  readLoopDone = readLoop();
  setConnLabel("Conectando… (o Arduino reinicia ao abrir a porta)");
  // O Uno reinicia ao abrir a serial e anuncia @HELLO sozinho;
  // se a placa não reiniciar, pedimos o estado explicitamente.
  setTimeout(() => { if (port && !connected) send("?"); }, 2500);
  setTimeout(() => {
    if (port && !connected) setConnLabel("Sem resposta. Confira a porta e se o firmware novo foi gravado.");
  }, 5000);
}

async function readLoop() {
  const decoder = new TextDecoder();
  let buffer = "";
  reader = port.readable.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) onLine(line);
      }
    }
  } catch (err) {
    console.warn("Leitura serial encerrada:", err);
  } finally {
    reader.releaseLock();
    reader = null;
  }
}

async function disconnect() {
  stopPlayback();
  const p = port;
  port = null;
  try { await reader?.cancel(); } catch {}
  await readLoopDone;
  try { writer?.releaseLock(); } catch {}
  writer = null;
  try { await p?.close(); } catch {}
  connected = false;
  state = null;
  boardKey = "";
  renderBoard();
  updateUi();
}

function handleLostConnection(msg) {
  showToast(msg, 3000);
  disconnect();
}

async function send(cmd) {
  if (!writer) return;
  try {
    await writer.write(new TextEncoder().encode(cmd));
  } catch (err) {
    handleLostConnection("Falha ao enviar para o Arduino.");
  }
}

// ---------------------------------------------------------------------------
// Mensagens do Arduino

function onLine(line) {
  if (line.startsWith("@HELLO")) {
    connected = true;
    setConnLabel("Arduino conectado");
    updateUi();
    return;
  }
  if (line.startsWith("@S ")) {
    connected = true;
    applyState(parseState(line));
    return;
  }
  // mensagens de texto do Arduino (NIVEL 1/6, VITORIA!, ...) — úteis para depuração
  console.debug("[Arduino]", line);
}

function parseState(line) {
  const [, lvl, moves, optimal, wins, status, current, selected, ...cars] = line.split(" ");
  return {
    level: +lvl,
    moves: +moves,
    optimal: +optimal,
    wins: +wins,
    status: +status,
    current: +current,
    selected: selected === "1",
    vehicles: cars.filter((c) => c.length === 5).map((c, idx) => ({
      idx,
      row: +c[0],
      col: +c[1],
      len: +c[2],
      orient: c[3],
      color: SPRITES[+c[4]] || SPRITES[0],
    })),
  };
}

function applyState(next) {
  const prev = state;
  state = next;

  const key = `${next.level}|${next.vehicles.map((v) => v.color + v.orient + v.len).join(",")}`;
  if (key !== boardKey) {
    boardKey = key;
    renderBoard();
    if (next.level && (!prev || prev.level !== next.level)) clearLog();
  } else {
    logMovement(prev, next);
    positionAll();
  }

  // Resolver termina assim que o nível acaba (libera o controle na hora)
  if (playing && next.status !== STATUS.PLAYING) {
    playToken++;
    playing = false;
    highlightStep(-1);
  }

  if (prev && prev.status !== STATUS.WON && next.status === STATUS.WON) {
    showToast(`🏁 Nível ${next.level} concluído em ${next.moves} movimentos! (ótimo: ${next.optimal})`, 4000);
  }
  updateUi();
}

// ---------------------------------------------------------------------------
// Tabuleiro espelhado

function cellSize() {
  return $("ard-grid").clientWidth / GRID;
}

function renderBoard() {
  const grid = $("ard-grid");
  grid.innerHTML = "";
  vehicleEls = [];
  if (!state) return;
  for (const v of state.vehicles) {
    const el = document.createElement("div");
    el.className = "vehicle mirror" + (v.orient === "V" ? " v" : "");
    if (v.color === MAIN_COLOR) el.classList.add("main");
    const img = document.createElement("img");
    img.src = `${VEHICLES_PATH}/${v.color}.png`;
    img.alt = COLOR_PT[v.color] || v.color;
    el.appendChild(img);
    grid.appendChild(el);
    vehicleEls[v.idx] = el;
  }
  positionAll(false);
}

function positionAll(animate = true) {
  if (!state) return;
  const c = cellSize();
  const PAD = 0.94;
  const finished = state.status === STATUS.WON || state.status === STATUS.COMPLETED;
  for (const v of state.vehicles) {
    const el = vehicleEls[v.idx];
    if (!el) continue;
    const img = el.firstChild;
    const boxW = (v.orient === "H" ? v.len : 1) * c;
    const boxH = (v.orient === "H" ? 1 : v.len) * c;
    el.classList.toggle("animate", animate);
    el.style.left = `${v.col * c}px`;
    el.style.top = `${v.row * c}px`;
    el.style.width = `${boxW}px`;
    el.style.height = `${boxH}px`;
    img.style.width = `${(v.orient === "V" ? boxH : boxW) * PAD}px`;
    img.style.height = `${(v.orient === "V" ? boxW : boxH) * PAD}px`;

    const isCurrent = v.idx === state.current && !finished;
    el.classList.toggle("focus", isCurrent && !state.selected);
    el.classList.toggle("picked", isCurrent && state.selected);
  }
  // carro vermelho "sai" do tabuleiro na vitória, como no jogo web
  if (finished) {
    const red = state.vehicles.find((v) => v.color === MAIN_COLOR);
    if (red && vehicleEls[red.idx]) vehicleEls[red.idx].style.left = `${(GRID + 0.5) * c}px`;
  }
}

// Mostra o que mudou no tabuleiro físico ("Azul ➡ 1")
function logMovement(prev, next) {
  if (!prev || prev.vehicles.length !== next.vehicles.length) return;
  for (const v of next.vehicles) {
    const p = prev.vehicles[v.idx];
    const dRow = v.row - p.row;
    const dCol = v.col - p.col;
    if (!dRow && !dCol) continue;
    const dir = dCol > 0 ? "right" : dCol < 0 ? "left" : dRow > 0 ? "down" : "up";
    addLog(`${COLOR_PT[v.color] || v.color} ${DIR_ARROW[dir]}`, v.color);
  }
}

function addLog(text, color) {
  const ol = $("ard-log");
  const li = document.createElement("li");
  li.innerHTML = `<span class="log-dot" data-color="${color || ""}"></span>${text}`;
  ol.prepend(li);
  while (ol.children.length > 12) ol.lastChild.remove();
}

function clearLog() {
  $("ard-log").innerHTML = "";
  $("ard-steps").innerHTML = "";
  $("ard-steps-box").classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Controles: níveis, cancelar, resolver

function renderLevelButtons() {
  const box = $("ard-levels");
  box.innerHTML = "";
  for (const l of LEVELS) {
    const btn = document.createElement("button");
    btn.className = `ard-level ${l.cls}`;
    btn.dataset.level = l.numero;
    btn.innerHTML = `<span class="num">${l.numero}</span><span class="lbl">${l.label}</span>`;
    btn.addEventListener("click", () => { stopPlayback(); send(`L${l.numero}`); });
    box.appendChild(btn);
  }
}

function cancel() {
  stopPlayback();
  send("Q");
}

function stopPlayback() {
  if (playing) showToast("Resolução interrompida.");
  playToken++;
  playing = false;
  updateUi();
}

// Calcula a solução ótima a partir do estado ATUAL do tabuleiro físico e
// executa no Arduino (hintOnly = só o próximo movimento).
async function runSolver(hintOnly) {
  if (!state || state.status !== STATUS.PLAYING || playing) return;
  const token = ++playToken;
  playing = true;
  updateUi();
  setSolverLabel("Calculando a solução (A*)…");

  let sol;
  try {
    sol = await solve(state.vehicles.map(({ color, orient, len, row, col }) => ({ color, orient, len, row, col })));
  } catch (err) {
    showToast("Não foi possível resolver (API offline?).", 3500);
    if (token === playToken) { playing = false; updateUi(); }
    setSolverLabel("");
    return;
  }
  if (token !== playToken) return;

  const steps = hintOnly ? sol.steps.slice(0, 1) : sol.steps;
  setSolverLabel(hintOnly
    ? `Dica: faltam ${sol.moves} movimentos no mínimo.`
    : `Solução ótima: ${sol.moves} movimentos.`);
  renderSteps(steps);

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const v = state.vehicles.find((x) => x.color === s.color);
    if (!v) break;
    highlightStep(i);
    await send(`C${v.idx}`);
    await sleep(450); // deixa o carro piscando antes de andar
    for (let k = 0; k < s.count; k++) {
      if (token !== playToken) return;
      await send(DIR_CMD[s.dir]);
      await sleep(300);
    }
    if (token !== playToken) return;
  }
  highlightStep(-1);
  playing = false;
  updateUi();
}

function renderSteps(steps) {
  const ol = $("ard-steps");
  ol.innerHTML = "";
  steps.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="text-slate-400 w-6 text-right">${i + 1}.</span>
      <span class="font-semibold">${COLOR_PT[s.color] || s.color}</span>
      <span class="text-lg leading-none">${DIR_ARROW[s.dir]}</span>
      <span class="text-slate-500">${s.count}x</span>`;
    ol.appendChild(li);
  });
  $("ard-steps-box").classList.remove("hidden");
}

function highlightStep(i) {
  [...$("ard-steps").children].forEach((li, j) => {
    li.classList.toggle("current", j === i);
    li.classList.toggle("done", i < 0 || j < i);
  });
}

// ---------------------------------------------------------------------------
// Controle Xbox (Gamepad API) e teclado

let padPrev = {};

function pollGamepad() {
  requestAnimationFrame(pollGamepad);
  const gp = [...(navigator.getGamepads?.() || [])].find(Boolean);
  setPadLabel(gp);
  if (!gp) { padPrev = {}; return; }

  const b = (i) => !!gp.buttons[i]?.pressed;
  const ax = gp.axes[0] || 0;
  const ay = gp.axes[1] || 0;
  const now = {
    A: b(0), X: b(2), Y: b(3),
    UP: b(12) || ay < -0.6, DOWN: b(13) || ay > 0.6,
    LEFT: b(14) || ax < -0.6, RIGHT: b(15) || ax > 0.6,
  };
  for (const k of Object.keys(now)) {
    if (now[k] && !padPrev[k]) playerInput(PAD_CMD[k]);
  }
  padPrev = now;
}

function onKey(e) {
  if (!active) return;
  const map = {
    ArrowUp: "W", ArrowDown: "S", ArrowLeft: "E", ArrowRight: "D",
    Enter: "A", a: "A", A: "A", x: "X", X: "X", y: "Y", Y: "Y",
  };
  const cmd = map[e.key];
  if (!cmd) return;
  e.preventDefault();
  playerInput(cmd);
}

// Entrada do jogador: ignorada fora da tela ou enquanto o Resolver joga
function playerInput(cmd) {
  if (!active || !connected || playing) return;
  send(cmd);
}

// ---------------------------------------------------------------------------
// HUD e textos

const STATUS_TEXT = {
  [STATUS.IDLE]: "Escolha um nível",
  [STATUS.PLAYING]: "Jogando",
  [STATUS.WON]: "Venceu! Aperte A para o próximo nível",
  [STATUS.COMPLETED]: "🏆 Todos os níveis concluídos!",
};

function updateUi() {
  const s = state;
  $("ard-connect").textContent = connected || port ? "DESCONECTAR" : "🔌 CONECTAR ARDUINO";
  $("ard-connect").classList.toggle("btn-gray", !!(connected || port));
  $("ard-connect").classList.toggle("btn-green", !(connected || port));
  if (!port) setConnLabel("Desconectado");

  $("ard-hud-level").textContent = s && s.level ? s.level : "-";
  $("ard-hud-moves").textContent = s ? s.moves : 0;
  $("ard-hud-optimal").textContent = s && s.level ? s.optimal : "-";
  $("ard-hud-wins").textContent = s ? s.wins : 0;
  $("ard-status").textContent = connected ? (playing ? "🤖 Resolver jogando…" : STATUS_TEXT[s?.status ?? 0]) : "Conecte o Arduino para jogar";
  $("ard-status").dataset.status = connected ? (s?.status ?? 0) : "off";

  const canPlay = connected && s && s.status === STATUS.PLAYING;
  $("ard-solve").disabled = !canPlay || playing;
  $("ard-hint").disabled = !canPlay || playing;
  $("ard-restart").disabled = !connected || !s || s.status === STATUS.IDLE;
  $("ard-cancel").disabled = !connected || ((!s || s.status === STATUS.IDLE) && !playing);
  document.querySelectorAll(".ard-level").forEach((btn) => {
    btn.disabled = !connected;
    btn.classList.toggle("active", !!s && s.status !== STATUS.IDLE && +btn.dataset.level === s.level);
  });
  $("ard-empty").classList.toggle("hidden", !!(s && s.vehicles.length));
}

function setConnLabel(text) {
  $("ard-conn-label").textContent = text;
}

function setSolverLabel(text) {
  $("ard-solver-label").textContent = text;
}

let lastPadName = null;
function setPadLabel(gp) {
  const name = gp ? gp.id : null;
  if (name === lastPadName) return;
  lastPadName = name;
  $("ard-pad-label").textContent = gp
    ? "🎮 Controle conectado"
    : "🎮 Aperte um botão do controle (ou use o teclado)";
}
