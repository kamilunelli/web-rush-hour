# Hora do Rush — Solucionador A\*

Jogo web do Rush Hour (tabuleiro 6x6). O jogador resolve manualmente e, futuramente,
poderá pedir a solução ótima calculada por um backend com **algoritmo A\***.

## Stack

- **Frontend:** HTML, CSS e JavaScript puro + **TailwindCSS**
- **Backend:** Python + **FastAPI**
- **Banco:** **PostgreSQL**
- **Ambiente:** tudo em **Docker** (3 containers)

## Como rodar (só precisa ter o Docker instalado)

```bash
docker compose up        # sobe banco + API + site
# (para desligar: Ctrl+C e depois `docker compose down`)
```

| Serviço  | URL                                            |
|----------|------------------------------------------------|
| Site     | http://localhost:3000                          |
| API      | http://localhost:8000                          |
| API docs | http://localhost:8000/docs                     |
| Banco    | localhost:5432 (`rush` / `rush123` / `rush_hour`) |

O código é espelhado para dentro dos containers (volumes) e o watch usa **polling**,
então basta editar os arquivos — o backend (uvicorn) e o frontend (Tailwind +
browser-sync) recarregam sozinhos, inclusive no Windows.

## Estado atual (parte do Jogador)

O jogador já joga de ponta a ponta:

- 4 telas: Inicial, Regras, Recordes e Jogo.
- 10 níveis fixos (mapa + solução ótima pré-calculada), sorteados sem repetir.
- Tabuleiro 6x6 jogável: arrastar veículos no próprio eixo, com colisão e limites.
- Cronômetro e contador de movimentos (arrastar N casas = 1 movimento).
- Vitória quando o carro vermelho chega à saída, com modal (tempo, movimentos, score).
- Score = `10000 − (movimentos acima do ótimo)×100 − (segundos)×15`.
- Recordes salvos no PostgreSQL e ranking por score.
- Botão **Resolver**: chama o **solver A\*** no backend, mostra o nº mínimo de
  movimentos + passo a passo e pode reproduzir a solução no tabuleiro.
  Usar o Resolver invalida o recorde da tentativa (RN05).

## Solver A\* (backend)

`app/solver.py` implementa a busca A\* conforme a formalização do projeto:
custo uniforme de 1 por movimento e heurística admissível = nº de veículos
bloqueando o caminho do vermelho até a saída. Validado: os movimentos mínimos
do A\* batem com o ótimo (BFS) em todos os 10 níveis.

## Endpoints da API

| Método | Rota        | Descrição                              |
|--------|-------------|----------------------------------------|
| GET    | `/health`   | Teste de vida                          |
| GET    | `/levels`   | Os 10 níveis fixos                     |
| GET    | `/records`  | Ranking das partidas                   |
| POST   | `/records`  | Salva uma partida concluída            |
| POST   | `/solve`    | Roda o A\* e devolve nº mínimo + passos |

## Estrutura

```
backend/     API FastAPI (app/main.py, app/db.py, app/solver.py, app/levels_data.json)
frontend/    HTML/CSS/JS + Tailwind (index.html, src/js/, src/assets/)
docker-compose.yml
```

## Rodar sem Docker (opcional)

<details>
<summary>Backend</summary>

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```
</details>

<details>
<summary>Frontend</summary>

```bash
cd frontend
npm install
npm run dev
```
</details>
