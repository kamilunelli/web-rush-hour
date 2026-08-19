# Imagem base: Node (para rodar o Tailwind e o servidor de live-reload).
FROM node:22-slim

WORKDIR /app

# Instala as dependências primeiro (cache de camada, igual ao backend).
COPY package*.json ./
RUN npm install

# Copia o restante (em dev o docker-compose espelha via volume).
COPY . .

# Roda Tailwind (watch) + servidor com live-reload ao mesmo tempo.
CMD ["npm", "run", "dev"]
