"""Banco de dados (PostgreSQL via psycopg): conexão, tabelas e seed dos níveis."""

import os
import json
import time
from pathlib import Path

import psycopg
from psycopg.types.json import Json

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://rush:rush123@db:5432/rush_hour")
LEVELS_FILE = Path(__file__).parent / "levels_data.json"


def get_conn():
    return psycopg.connect(DATABASE_URL)


def wait_for_db(retries: int = 10, delay: float = 1.5):
    # O banco pode demorar a aceitar conexões ao subir.
    for tentativa in range(1, retries + 1):
        try:
            with get_conn():
                return
        except Exception as e:  # noqa: BLE001
            print(f"[db] aguardando o banco ({tentativa}/{retries})... {e}")
            time.sleep(delay)
    raise RuntimeError("Não foi possível conectar ao banco de dados.")


def init_db():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS levels (
                numero         INTEGER PRIMARY KEY,
                optimal_moves  INTEGER NOT NULL,
                vehicles       JSONB   NOT NULL
            );
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS records (
                id             SERIAL PRIMARY KEY,
                level_numero   INTEGER NOT NULL,
                time_seconds   INTEGER NOT NULL,
                moves          INTEGER NOT NULL,
                score          INTEGER NOT NULL,
                played_at      TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """
        )
        conn.commit()


def seed_levels():
    # Insere os 10 níveis só se a tabela estiver vazia.
    if not LEVELS_FILE.exists():
        print(f"[db] AVISO: {LEVELS_FILE.name} não encontrado; nenhum nível inserido.")
        return

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM levels;")
        (qtd,) = cur.fetchone()
        if qtd and qtd > 0:
            print(f"[db] {qtd} níveis já existem; seed ignorado.")
            return

        data = json.loads(LEVELS_FILE.read_text(encoding="utf-8"))
        for lv in data:
            cur.execute(
                "INSERT INTO levels (numero, optimal_moves, vehicles) VALUES (%s, %s, %s);",
                (lv["numero"], lv["optimal_moves"], Json(lv["vehicles"])),
            )
        conn.commit()
        print(f"[db] {len(data)} níveis inseridos.")
