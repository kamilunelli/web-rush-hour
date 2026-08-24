// Configurações globais do frontend.

// A API roda na mesma máquina, porta 8000. Usamos o hostname atual
// para funcionar tanto em "localhost" quanto se acessado por IP na rede.
export const API_BASE = `http://${location.hostname}:8000`;

// Pasta dos sprites já normalizados (horizontais, recortados).
export const VEHICLES_PATH = "./src/assets/vehicles";

// Tamanho do tabuleiro (6x6).
export const GRID = 6;

// Carro principal (o que precisa sair pela direita).
export const MAIN_COLOR = "red-car";
