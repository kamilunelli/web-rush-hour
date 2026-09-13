"""API do Hora do Rush (FastAPI): níveis e solver A*. Sem banco de dados."""

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import solver

# Níveis carregados do arquivo (não há mais banco).
LEVELS = json.loads((Path(__file__).parent / "levels_data.json").read_text(encoding="utf-8"))

app = FastAPI(title="Hora do Rush - API")

# CORS liberado para o frontend chamar a API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Modelos
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
    return LEVELS


@app.post("/solve")
def solve_board(data: SolveIn):
    # A* a partir do estado inicial (RF06/RF07/RN07).
    result = solver.solve([v.model_dump() for v in data.vehicles])
    if not result["solvable"]:
        raise HTTPException(status_code=422, detail="Tabuleiro sem solução.")
    return result
