# Hora do Rush — Solucionador A\*

Jogo web do Rush Hour (tabuleiro 6x6). O jogador escolhe um nível, resolve
arrastando os veículos e pode pedir a **solução ótima** calculada por um backend
com **algoritmo A\***.

## Stack

- **Frontend:** HTML, CSS e JavaScript puro + **TailwindCSS**
- **Backend:** Python + **FastAPI** (níveis e solver A\*)
- **Recordes:** salvos no **localStorage** do navegador (sem banco de dados)
- **Ambiente local:** **Docker** (2 containers: backend e frontend)

## Como rodar (só precisa ter o Docker instalado)

```bash
docker compose up        # sobe API + site
# (para desligar: Ctrl+C e depois `docker compose down`)
```

| Serviço  | URL                          |
|----------|------------------------------|
| Site     | http://localhost:3000        |
| API      | http://localhost:8000        |
| API docs | http://localhost:8000/docs   |

O código é espelhado para dentro dos containers (volumes) e o watch usa **polling**,
então basta editar os arquivos — o backend (uvicorn) e o frontend (Tailwind +
browser-sync) recarregam sozinhos, inclusive no Windows.

## Funcionalidades

- Telas: Inicial, Seleção de nível, Regras, Recordes, Desempenho e Jogo.
- **Escolha do nível** (1 a 10, com dificuldade) ao clicar em Jogar + um Nível Teste.
- Tabuleiro 6x6 jogável: arrastar veículos no próprio eixo, com colisão e limites.
- Cronômetro e contador de movimentos (arrastar N casas = 1 movimento).
- Vitória quando o carro vermelho chega à saída, com modal (tempo, movimentos, score).
- Score = `10000 − (movimentos acima do ótimo)×100 − (segundos)×15`.
- **Recordes** (localStorage) com pódio e tela de **Desempenho** com gráficos por partida.
- Botão **Resolver**: chama o **solver A\*** no backend, mostra o nº mínimo de
  movimentos + passo a passo e reproduz a solução no tabuleiro. Usar o Resolver
  invalida o recorde daquela tentativa.

## Solver A\* (backend)

`app/solver.py` implementa a busca A\*: custo uniforme de 1 por movimento e
heurística admissível = nº de veículos bloqueando o caminho do vermelho até a
saída. Validado: os movimentos mínimos do A\* batem com o ótimo (BFS) nos 10 níveis.

## Endpoints da API

| Método | Rota      | Descrição                              |
|--------|-----------|----------------------------------------|
| GET    | `/health` | Teste de vida                          |
| GET    | `/levels` | Os 10 níveis fixos                     |
| POST   | `/solve`  | Roda o A\* e devolve nº mínimo + passos |

## Estrutura

```
backend/     API FastAPI (app/main.py, app/solver.py, app/levels_data.json)
frontend/    HTML/CSS/JS + Tailwind (index.html, src/js/, src/assets/)
docker-compose.yml
```

## Hospedagem

- **Frontend:** Vercel (site estático; Root Directory `frontend`).
- **Backend:** Render (Python: `pip install -r requirements.txt` +
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
- A URL do backend em produção fica em `frontend/src/js/config.js` (`API_BASE`).

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
