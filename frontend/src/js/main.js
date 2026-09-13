// Bootstrap: carrega dados e conecta os eventos dos botões.

import { getLevels } from "./api.js";
import { getRecords } from "./store.js";
import { goto, renderRecords, renderLevels, showToast } from "./ui.js";
import { renderPerformance } from "./performance.js";
import * as game from "./game.js";

const optimalByLevel = { 0: 2 }; // 0 = nível de teste
let levelsData = [];
let currentRecords = [];

async function boot() {
  try {
    levelsData = await getLevels();
    game.setLevels(levelsData);
    levelsData.forEach((l) => (optimalByLevel[l.numero] = l.optimal_moves));
  } catch (err) {
    showToast("API offline — inicie o backend (docker compose up).", 4000);
    console.error(err);
  }

  game.setOnRecordSaved(loadRecords);

  // Navegação (botões com data-goto)
  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dest = btn.dataset.goto;
      goto(dest);
      if (dest === "levels") renderLevels(levelsData, playLevel);
      if (dest === "records") loadRecords();
    });
  });

  // Jogo
  document.getElementById("btn-solve").addEventListener("click", game.onSolveClick);
  document.getElementById("btn-restart").addEventListener("click", game.restart);
  document.getElementById("btn-test").addEventListener("click", () => {
    goto("game");
    game.enterTestLevel();
  });

  // Modal de vitória
  document.getElementById("modal-again").addEventListener("click", game.playAgain);
  document.getElementById("modal-next").addEventListener("click", nextLevel);
  const exitToMenu = () => { game.exitToMenu(); goto("home"); };
  document.getElementById("modal-close").addEventListener("click", exitToMenu);
  document.getElementById("modal-exit").addEventListener("click", exitToMenu);

  // Dashboard do solver
  document.getElementById("solve-play").addEventListener("click", game.playSolution);
  document.getElementById("solve-close").addEventListener("click", game.closeSolve);
  document.getElementById("solve-ok").addEventListener("click", game.closeSolve);
}

// Escolhe um nível na tela de seleção.
function playLevel(numero) {
  goto("game");
  game.enterLevel(numero);
}

// "Próxima fase": vai pro nível seguinte; se não houver, volta à seleção.
function nextLevel() {
  const next = (game.currentNumero() ?? 0) + 1;
  if (game.hasLevel(next)) {
    playLevel(next);
  } else {
    goto("levels");
    renderLevels(levelsData, playLevel);
  }
}

// Abre a tela de desempenho de um record.
function openPerformance(rec) {
  const optimal = optimalByLevel[rec.level_numero] ?? rec.moves;
  goto("performance");
  renderPerformance(rec, optimal, currentRecords);
}

function loadRecords() {
  currentRecords = getRecords(10);
  renderRecords(currentRecords, openPerformance);
}

boot();
