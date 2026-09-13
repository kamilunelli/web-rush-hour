// Constantes globais do frontend.

const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);

// Em produção aponta para o backend no Render; em dev, para o localhost.
// >>> troque a URL abaixo pela do seu serviço no Render depois de criá-lo <<<
export const API_BASE = isLocal
  ? "http://localhost:8000"
  : "https://rush-hour-e9f7.onrender.com";

export const VEHICLES_PATH = "./src/assets/vehicles"; // sprites normalizados
export const GRID = 6;
export const MAIN_COLOR = "red-car"; // carro que precisa sair
