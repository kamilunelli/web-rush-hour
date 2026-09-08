// Bootstrap: carrega dados e conecta os eventos dos botões.

import { getLevels, getRecords } from "./api.js";
import { goto, renderRecords, showToast } from "./ui.js";
import * as game from "./game.js";

async function boot() {
  try {
    game.setLevels(await getLevels());
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
      if (dest === "game") game.enterGame();
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
  document.getElementById("modal-next").addEventListener("click", game.playNext);
  const exitToMenu = () => { game.exitToMenu(); goto("home"); };
  document.getElementById("modal-close").addEventListener("click", exitToMenu);
  document.getElementById("modal-exit").addEventListener("click", exitToMenu);

  // Dashboard do solver
  document.getElementById("solve-play").addEventListener("click", game.playSolution);
  document.getElementById("solve-close").addEventListener("click", game.closeSolve);
  document.getElementById("solve-ok").addEventListener("click", game.closeSolve);
}

async function loadRecords() {
  try {
    renderRecords(await getRecords(10));
  } catch (err) {
    console.error(err);
  }
}

boot();
