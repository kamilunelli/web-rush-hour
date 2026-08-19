"""
Ponto de entrada da API (FastAPI).

Por enquanto tem só uma rota de "teste de vida" (/health) para confirmarmos
que o servidor sobe. As rotas do jogo (níveis, recordes e o solver A*)
serão adicionadas nos próximos passos.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Cria a aplicação. O "title" aparece na documentação automática em /docs.
app = FastAPI(title="Hora do Rush - API")

# CORS: o frontend (aberto no navegador) e o backend rodam em endereços
# diferentes. Sem isso, o navegador BLOQUEIA as chamadas do JS para a API.
# Em desenvolvimento liberamos tudo ("*"); depois restringimos.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Rota simples para testar se a API está no ar."""
    return {"status": "ok", "projeto": "Hora do Rush"}
