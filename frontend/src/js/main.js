// Ponto de entrada do frontend: carrega dados e conecta os eventos.

import { getLevels, getRecords } from "./api.js";
import { goto, renderRecords, showToast } from "./ui.js";
import * as game from "./game.js";

async function boot() {
  // 1) Carrega os 10 níveis da API.
  try {
    const levels = await getLevels();
    game.setLevels(levels);
  } catch (err) {
    showToast("API offline — inicie o backend (docker compose up).", 4000);
    console.error(err);
  }

  // 2) Quando um recorde é salvo, atualiza a tabela de recordes.
  game.setOnRecordSaved(loadRecords);

  // 3) Navegação (todos os botões com data-goto).
  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dest = btn.dataset.goto;
      goto(dest);
      if (dest === "game") game.enterGame();
      if (dest === "records") loadRecords();
    });
  });

  // 4) Botões do jogo.
  document.getElementById("btn-solve").addEventListener("click", game.onSolveClick);
  document.getElementById("btn-restart").addEventListener("click", game.restart);

  // Nível de teste (bem fácil, não conta para recordes).
  document.getElementById("btn-test").addEventListener("click", () => {
    goto("game");
    game.enterTestLevel();
  });

  // 5) Botões do modal de vitória.
  document.getElementById("modal-again").addEventListener("click", game.playAgain);
  document.getElementById("modal-next").addEventListener("click", game.playNext);
}

async function loadRecords() {
  try {
    const records = await getRecords(10);
    renderRecords(records);
  } catch (err) {
    console.error(err);
  }
}

boot();
