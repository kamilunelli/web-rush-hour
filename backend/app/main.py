"""
API do Hora do Rush (FastAPI).

Endpoints (parte do JOGADOR — o solver A* fica para depois):
  GET  /health          -> teste de vida
  GET  /levels          -> os 10 níveis fixos (mapa + solução ótima)
  GET  /records         -> ranking das melhores partidas
  POST /records         -> salva uma partida concluída

No startup, cria as tabelas e popula os 10 níveis (se ainda não existirem).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Executado uma vez, quando a API sobe.
    db.wait_for_db()
    db.init_db()
    db.seed_levels()
    yield
    # (nada a fazer no shutdown)


app = FastAPI(title="Hora do Rush - API", lifespan=lifespan)

# Libera o frontend (navegador) a chamar a API. Em dev, liberamos tudo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Modelos de entrada/saída ----------
class RecordIn(BaseModel):
    """Dados enviados pelo frontend ao concluir uma partida."""
    level_numero: int = Field(..., ge=1, le=10)
    time_seconds: int = Field(..., ge=0)
    moves: int = Field(..., ge=0)
    score: int = Field(..., ge=0)


# ---------- Rotas ----------
@app.get("/health")
def health():
    return {"status": "ok", "projeto": "Hora do Rush"}


@app.get("/levels")
def list_levels():
    """Retorna os 10 níveis fixos (número, solução ótima e veículos)."""
    with db.get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT numero, optimal_moves, vehicles FROM levels ORDER BY numero;"
        )
        rows = cur.fetchall()
    return [
        {"numero": n, "optimal_moves": opt, "vehicles": veh}
        for (n, opt, veh) in rows
    ]


@app.get("/records")
def list_records(limit: int = 10):
    """
    Ranking das melhores partidas: maior score primeiro
    (empate: menos tempo, depois menos movimentos).
    """
    with db.get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, level_numero, time_seconds, moves, score, played_at
            FROM records
            ORDER BY score DESC, time_seconds ASC, moves ASC
            LIMIT %s;
            """,
            (limit,),
        )
        rows = cur.fetchall()
    return [
        {
            "id": r[0],
            "level_numero": r[1],
            "time_seconds": r[2],
            "moves": r[3],
            "score": r[4],
            "played_at": r[5].isoformat(),
        }
        for r in rows
    ]


@app.post("/records", status_code=201)
def create_record(rec: RecordIn):
    """Salva uma partida concluída e retorna o registro criado."""
    with db.get_conn() as conn, conn.cursor() as cur:
        # Garante que o nível existe.
        cur.execute("SELECT 1 FROM levels WHERE numero = %s;", (rec.level_numero,))
        if cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="Nível inexistente.")

        cur.execute(
            """
            INSERT INTO records (level_numero, time_seconds, moves, score)
            VALUES (%s, %s, %s, %s)
            RETURNING id, played_at;
            """,
            (rec.level_numero, rec.time_seconds, rec.moves, rec.score),
        )
        rec_id, played_at = cur.fetchone()
        conn.commit()

    return {
        "id": rec_id,
        "level_numero": rec.level_numero,
        "time_seconds": rec.time_seconds,
        "moves": rec.moves,
        "score": rec.score,
        "played_at": played_at.isoformat(),
    }
