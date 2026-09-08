# Documentação — Hora do Rush (Solucionador A\*)

## 1. Visão geral
Jogo web do Rush Hour (tabuleiro 6×6). O jogador arrasta veículos para liberar o
carro **vermelho** até a saída. Há 10 níveis fixos + 1 de teste, cronômetro,
pontuação, ranking persistido e um **solver A\*** que calcula a solução ótima.

## 2. Arquitetura (3 containers Docker)

```
frontend (:3000)  ──HTTP──►  backend (:8000)  ──SQL──►  db (:5432)
HTML/CSS/JS+Tailwind         FastAPI/uvicorn            PostgreSQL 16
```

Sobe tudo com `docker compose up` (só precisa do Docker). Código espelhado por
volumes + polling → editar recarrega sozinho, inclusive no Windows.

| Serviço | URL | Tecnologia |
|--------|-----|-----------|
| Site | http://localhost:3000 | HTML/CSS/JS puro + TailwindCSS v4 |
| API | http://localhost:8000 (`/docs`) | Python + FastAPI |
| Banco | localhost:5432 (`rush`/`rush123`/`rush_hour`) | PostgreSQL 16 |

## 3. Estrutura de arquivos

```
backend/
  app/
    main.py         API FastAPI (rotas)
    db.py           conexão, tabelas e seed dos níveis
    solver.py       algoritmo A*
    levels_data.json  os 10 níveis fixos (gerados via BFS)
frontend/
  index.html        as 4 telas + modais
  src/css/input.css estilos (Tailwind + tabuleiro/veículos)
  src/js/
    config.js       constantes
    api.js          chamadas HTTP à API
    ui.js           navegação, recordes, solução
    game.js         núcleo do jogo (drag, colisão, timer, score)
    main.js         bootstrap (liga tudo)
  src/assets/        sprites (originais + normalizados), logo, fundo
docker-compose.yml
```

## 4. Banco de dados

```sql
levels  ( numero INT PK, optimal_moves INT, vehicles JSONB )
records ( id SERIAL PK, level_numero INT, time_seconds INT,
          moves INT, score INT, played_at TIMESTAMPTZ )
```

## 5. Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | teste de vida |
| GET | `/levels` | os 10 níveis |
| GET | `/records?limit=N` | ranking (score desc) |
| POST | `/records` | salva partida concluída |
| POST | `/solve` | A\*: nº mínimo + passo a passo |

## 6. Algoritmo A\* (formalização)

- **Estado:** posição (row, col) de cada veículo no grid 6×6.
- **Ações:** deslizar um veículo pelo eixo até qualquer posição livre (1 ação = 1 destino).
- **Custo g(n):** 1 por movimento (uniforme).
- **Objetivo:** vermelho ocupando as colunas 4 e 5 da linha 2.
- **Heurística h(n):** nº de veículos bloqueando o caminho do vermelho até a saída.
  Cada bloqueador exige ≥ 1 movimento → **admissível** → A\* devolve o ótimo.

Validação: os movimentos mínimos do A\* coincidem com o ótimo (BFS) nos 10 níveis.

## 7. Pontuação (RN06)

`score = 10000 − (movimentos acima do ótimo)×100 − (segundos)×15` (piso 100).
O `optimal_moves` vem do nível. Usar o Resolver invalida o recorde (RN05).

## 8. Rastreabilidade

### Requisitos Funcionais
| RF | Descrição | Status | Onde |
|----|-----------|--------|------|
| RF01 | 4 telas | ✅ | `index.html`, `ui.goto` |
| RF02 | iniciar nível aleatório | ✅ | `game.js` (fila embaralhada) |
| RF03 | tabuleiro 6×6 + arrastar | ✅ | `game.js` |
| RF04 | score na vitória | ✅ | `game.computeScore` |
| RF05 | salvar partida | ✅ | `POST /records` |
| RF06 | botão Resolver (pausa + pede solução) | ✅ | `game.onSolveClick` |
| RF07 | exibir nº mínimo + passo a passo | ✅ | `ui.renderSolution` |
| RF08 | recordes ranqueados | ✅ | `GET /records`, `ui.renderRecords` |

### Requisitos Não Funcionais
| RNF | Descrição | Status |
|-----|-----------|--------|
| RNF01 | Python + FastAPI | ✅ |
| RNF02 | Algoritmo A\* | ✅ (`solver.py`) |
| RNF03 | HTML/CSS/JS puro + Tailwind | ✅ |
| RNF04 | PostgreSQL em Docker | ✅ |

### Regras de Negócio
| RN | Descrição | Status | Onde |
|----|-----------|--------|------|
| RN01 | move só no próprio eixo | ✅ | `game.freeRange` |
| RN02 | sem colisão / dentro do grid | ✅ | `game.occupancyExcept/freeRange` |
| RN03 | vitória: vermelho na saída | ✅ | `game.checkWin` |
| RN04 | arrastar N casas = 1 movimento | ✅ | `game.attachDrag` |
| RN05 | Resolver invalida recorde | ✅ | `game.solverUsed` |
| RN06 | score penaliza movimentos/tempo | ✅ | `game.computeScore` |
| RN07 | solver parte do estado inicial | ✅ | `game.onSolveClick` (usa `level.vehicles`) |
| RN08 | carros (2) e caminhões (3) | ✅ | dados dos níveis |

### Casos de Uso
| CDU | Descrição | Status |
|-----|-----------|--------|
| CDU01 | navegar entre telas | ✅ |
| CDU02 | iniciar partida | ✅ |
| CDU03 | interagir com o tabuleiro | ✅ |
| CDU04 | concluir e salvar | ✅ |
| CDU05 | acionar o solucionador | ✅ |
| CDU06 | processar solução A\* | ✅ |
| CDU07 | exibir passo a passo | ✅ |
| CDU08 | consultar ranking | ✅ |

## 9. Como rodar

```bash
docker compose up        # sobe tudo
# site: http://localhost:3000 | api: http://localhost:8000/docs
docker compose down      # desliga (mantém o banco)
```
