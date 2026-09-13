"""
Solver do Hora do Rush com busca A*.

Custo g(n)=1 por movimento; heurística h(n)= nº de veículos bloqueando o
caminho do vermelho até a saída (admissível -> A* devolve o ótimo).
solve(vehicles) -> {solvable, moves, steps=[{color, dir, count}]}.
"""

import heapq

GRID = 6
MAIN_COLOR = "red-car"
EXIT_COL = GRID - 2  # vermelho ocupa colunas 4 e 5


def solve(vehicles):
    meta = [(v["len"], v["orient"], v["color"]) for v in vehicles]
    main_i = next(i for i, v in enumerate(vehicles) if v["color"] == MAIN_COLOR)
    start = tuple((v["row"], v["col"]) for v in vehicles)

    def cells_of(i, r, c):
        L, o, _ = meta[i]
        return [(r, c + k) if o == "H" else (r + k, c) for k in range(L)]

    def occupancy(state):
        occ = {}
        for i, (r, c) in enumerate(state):
            for cell in cells_of(i, r, c):
                occ[cell] = i
        return occ

    def is_goal(state):
        r, c = state[main_i]
        return r == 2 and c == EXIT_COL

    # Função heurística
    def heuristic(state):
        occ = occupancy(state)
        r, c = state[main_i]
        Lm = meta[main_i][0]
        blockers = set()
        for col in range(c + Lm, GRID):
            who = occ.get((2, col))
            if who is not None and who != main_i:
                blockers.add(who)
        return len(blockers)

    # Função sucessora
    def neighbors(state):
        occ = occupancy(state)
        for i, (r, c) in enumerate(state):
            L, o, _ = meta[i]
            if o == "H":
                cc = c - 1
                while cc >= 0 and (r, cc) not in occ:
                    yield _apply(state, i, (r, cc)), (i, (r, c), (r, cc))
                    cc -= 1
                cc = c + L
                while cc < GRID and (r, cc) not in occ:
                    yield _apply(state, i, (r, cc - L + 1)), (i, (r, c), (r, cc - L + 1))
                    cc += 1
            else:
                cc = r - 1
                while cc >= 0 and (cc, c) not in occ:
                    yield _apply(state, i, (cc, c)), (i, (r, c), (cc, c))
                    cc -= 1
                cc = r + L
                while cc < GRID and (cc, c) not in occ:
                    yield _apply(state, i, (cc - L + 1, c)), (i, (r, c), (cc - L + 1, c))
                    cc += 1

    # A*
    counter = 0  # desempate estável na fila
    open_heap = [(heuristic(start), 0, counter, start)]
    came_from = {}
    g_score = {start: 0}
    closed = set()

    while open_heap:
        f, g, _, state = heapq.heappop(open_heap)
        if state in closed:
            continue
        if is_goal(state):
            return {"solvable": True, "moves": g, "steps": _rebuild(came_from, state, meta)}
        closed.add(state)

        for nxt, move in neighbors(state):
            ng = g + 1
            if ng < g_score.get(nxt, 1_000_000):
                g_score[nxt] = ng
                came_from[nxt] = (state, move)
                counter += 1
                heapq.heappush(open_heap, (ng + heuristic(nxt), ng, counter, nxt))

    return {"solvable": False, "moves": None, "steps": []}


def _apply(state, i, new_pos):
    lst = list(state)
    lst[i] = new_pos
    return tuple(lst)


def _rebuild(came_from, goal_state, meta):
    # Refaz o caminho e traduz cada movimento em {color, dir, count}.
    moves = []
    state = goal_state
    while state in came_from:
        prev, (i, old, new) = came_from[state]
        _, orient, color = meta[i]
        if orient == "H":
            delta = new[1] - old[1]
            direction = "right" if delta > 0 else "left"
        else:
            delta = new[0] - old[0]
            direction = "down" if delta > 0 else "up"
        moves.append({"color": color, "dir": direction, "count": abs(delta)})
        state = prev
    moves.reverse()
    return moves
