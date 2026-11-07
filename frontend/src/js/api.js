// Chamadas HTTP ao backend (FastAPI): níveis e solver.
import { API_BASE, API_FALLBACK } from "./config.js";

let base = API_BASE;

// Se o backend local não estiver rodando, passa a usar o do Render.
async function request(path, options) {
  try {
    return await fetch(`${base}${path}`, options);
  } catch (err) {
    if (!API_FALLBACK || base === API_FALLBACK) throw err;
    base = API_FALLBACK;
    console.info(`Backend local indisponível, usando ${API_FALLBACK}`);
    return fetch(`${base}${path}`, options);
  }
}

export async function getLevels() {
  const res = await request("/levels");
  if (!res.ok) throw new Error("Falha ao carregar níveis");
  return res.json();
}

export async function solve(vehicles) {
  const res = await request("/solve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicles }),
  });
  if (!res.ok) throw new Error("Falha ao resolver");
  return res.json();
}
