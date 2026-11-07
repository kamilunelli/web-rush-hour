// Constantes globais do frontend.

const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);

// Em produção aponta para o backend no Render; em dev, para o localhost.
// >>> troque a URL abaixo pela do seu serviço no Render depois de criá-lo <<<
const PROD_API = "https://rush-hour-e9f7.onrender.com";

export const API_BASE = isLocal ? "http://localhost:8000" : PROD_API;

// Rodando local sem o backend (sem Docker/Python), usa a API do Render.
export const API_FALLBACK = isLocal ? PROD_API : null;

export const VEHICLES_PATH = "./src/assets/vehicles"; // sprites normalizados
export const GRID = 6;
export const MAIN_COLOR = "red-car"; // carro que precisa sair
