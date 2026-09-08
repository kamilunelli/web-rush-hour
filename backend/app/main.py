"""API do Hora do Rush (FastAPI): níveis, recordes e solver A*."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import db
from . import solver


@asynccontextmanager
async def lifespan(app: FastAPI):
    # No startup: cria tabelas e popula os níveis (se preciso).
    db.wait_for_db()
    db.init_db()
    db.seed_levels()
    yield


app = FastAPI(title="Hora do Rush - API", lifespan=lifespan)

# CORS liberado (dev) para o frontend chamar a API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Modelos
class RecordIn(BaseModel):
    level_numero: int = Field(..., ge=0, le=10)  # 0 = nível de teste
    time_seconds: int = Field(..., ge=0)
    moves: int = Field(..., ge=0)
    score: int = Field(..., ge=0)


class VehicleIn(BaseModel):
    color: str
    orient: str = Field(..., pattern="^[HV]$")
    len: int = Field(..., ge=2, le=3)
    row: int = Field(..., ge=0, le=5)
    col: int = Field(..., ge=0, le=5)


class SolveIn(BaseModel):
    vehicles: list[VehicleIn]


# Rotas
@app.get("/health")
def health():
    return {"status": "ok", "projeto": "Hora do Rush"}


@app.get("/levels")
def list_levels():
    with db.get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT numero, optimal_moves, vehicles FROM levels ORDER BY numero;")
        rows = cur.fetchall()
    return [{"numero": n, "optimal_moves": opt, "vehicles": veh} for (n, opt, veh) in rows]


@app.get("/records")
def list_records(limit: int = 10):
    # Maior score primeiro; empate por menos tempo e menos movimentos.
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
            "id": r[0], "level_numero": r[1], "time_seconds": r[2],
            "moves": r[3], "score": r[4], "played_at": r[5].isoformat(),
        }
        for r in rows
    ]


@app.post("/solve")
def solve_board(data: SolveIn):
    # A* a partir do estado inicial (RF06/RF07/RN07).
    result = solver.solve([v.model_dump() for v in data.vehicles])
    if not result["solvable"]:
        raise HTTPException(status_code=422, detail="Tabuleiro sem solução.")
    return result


@app.post("/records", status_code=201)
def create_record(rec: RecordIn):
    with db.get_conn() as conn, conn.cursor() as cur:
        # 0 = nível de teste (não fica no banco).
        if rec.level_numero != 0:
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
        "id": rec_id, "level_numero": rec.level_numero, "time_seconds": rec.time_seconds,
        "moves": rec.moves, "score": rec.score, "played_at": played_at.isoformat(),
    }
