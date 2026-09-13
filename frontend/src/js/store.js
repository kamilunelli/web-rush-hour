// Recordes salvos no navegador (localStorage) — sem banco de dados.

const KEY = "rush_records";

function all() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function addRecord(rec) {
  const list = all();
  rec.id = Date.now();
  rec.played_at = new Date().toISOString();
  list.push(rec);
  localStorage.setItem(KEY, JSON.stringify(list));
  return rec;
}

// Maior score primeiro; empate por menos tempo e menos movimentos.
export function getRecords(limit = 10) {
  return all()
    .sort((a, b) => b.score - a.score || a.time_seconds - b.time_seconds || a.moves - b.moves)
    .slice(0, limit);
}
