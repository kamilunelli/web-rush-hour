// Chamadas HTTP ao backend (FastAPI): níveis e solver.
import { API_BASE } from "./config.js";

export async function getLevels() {
  const res = await fetch(`${API_BASE}/levels`);
  if (!res.ok) throw new Error("Falha ao carregar níveis");
  return res.json();
}

export async function solve(vehicles) {
  const res = await fetch(`${API_BASE}/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicles }),
  });
  if (!res.ok) throw new Error("Falha ao resolver");
  return res.json();
}
