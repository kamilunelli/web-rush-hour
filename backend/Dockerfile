# Imagem base: Python enxuto (slim = menor).
FROM python:3.12-slim

# Pasta de trabalho dentro do container.
WORKDIR /app

# Copia só o requirements primeiro. Assim, se o código mudar mas as
# dependências não, o Docker reaproveita a camada já instalada (build mais rápido).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código (o docker-compose ainda espelha via volume em dev).
COPY . .

# Sobe a API acessível de fora do container (0.0.0.0) com hot-reload.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
