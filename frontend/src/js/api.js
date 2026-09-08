// Chamadas HTTP ao backend (FastAPI).
import { API_BASE } from "./config.js";

export async function getLevels() {
  const res = await fetch(`${API_BASE}/levels`);
  if (!res.ok) throw new Error("Falha ao carregar níveis");
  return res.json();
}

export async function getRecords(limit = 10) {
  const res = await fetch(`${API_BASE}/records?limit=${limit}`);
  if (!res.ok) throw new Error("Falha ao carregar recordes");
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

export async function postRecord(record) {
  const res = await fetch(`${API_BASE}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error("Falha ao salvar recorde");
  return res.json();
}
