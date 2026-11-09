# Hora do Rush — Solucionador A*

Uma versão web interativa do clássico jogo de quebra-cabeça Hora do Rush (tabuleiro 6x6). O jogador escolhe um nível, resolve arrastando os veículos e pode pedir a solução ótima calculada por um backend com algoritmo A*.

## Stack
- **Frontend:** HTML, CSS e JavaScript puro + TailwindCSS
- **Backend:** Python + FastAPI (níveis e solver A*)
- **Recordes:** Salvos no `localStorage` do navegador (sem banco de dados)
- **Hospedagem:**
  - Frontend: Vercel (site estático; Root Directory `frontend`)
  - Backend: Render (Python com uvicorn)
  - *A URL do backend em produção fica em `frontend/src/js/config.js` (`API_BASE`).*

## Funcionalidades
- **Telas:** Inicial, Seleção de nível, Regras, Recordes, Desempenho e Jogo.
- **Escolha do nível:** 1 a 10 (com dificuldades variadas) + um Nível Teste.
- **Tabuleiro 6x6 jogável:** Arrastar veículos no próprio eixo, respeitando colisões e limites.
- **Métricas:** Cronômetro e contador de movimentos (arrastar *N* casas = 1 movimento).
- **Condição de Vitória:** O carro vermelho chega à saída, acionando um modal com tempo, movimentos e score.
- **Cálculo de Score:** `10000 − (movimentos acima do ótimo) × 100 − (segundos) × 15`.
- **Recordes:** Pódio salvo no `localStorage` e tela de Desempenho com gráficos por partida.
- **Botão Resolver:** Chama o solver A* no backend, mostra o número mínimo de movimentos + passo a passo e reproduz a solução no tabuleiro. *(Nota: Usar o Resolver invalida o recorde daquela tentativa).*

### Modo Arduino (Restrição Institucional)
> ⚠️ **Importante:** O **Modo Arduino** foi desenvolvido exclusivamente por **motivos institucionais** e **não está disponível** ao acessar o sistema de qualquer dispositivo comum. 

Ele exige conexão via USB com o hardware físico construído especificamente para o projeto (`hardware-rush-hour`: Arduino Uno + matriz de LED RGB 8x8). No ambiente institucional preparado, o site conecta pela Web Serial (Chrome/Edge), lê o controle Xbox ou teclado, espelha o tabuleiro físico e executa no Arduino a solução do A*. O código referente a esta integração reside em `frontend/src/js/arduino.js`.

## Solver A* (Backend)
O arquivo `app/solver.py` implementa a busca A* com:
- **Custo uniforme:** 1 por movimento.
- **Heurística admissível:** Número de veículos bloqueando o caminho do carro vermelho até a saída.
- *Validado: os movimentos mínimos do algoritmo batem perfeitamente com o ótimo (BFS) em todos os níveis.*

## Endpoints da API

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/health` | Teste de vida da API |
| `GET` | `/levels` | Retorna os 10 níveis fixos |
| `POST` | `/solve` | Roda o algoritmo A* e devolve o nº mínimo de movimentos e passos |

## Estrutura de Diretórios
```text
backend/     # API FastAPI (app/main.py, app/solver.py, app/levels_data.json)
frontend/    # HTML/CSS/JS + Tailwind (index.html, src/js/, src/assets/)
