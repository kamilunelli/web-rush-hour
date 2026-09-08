FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Tailwind (watch) + servidor com live-reload
CMD ["npm", "run", "dev"]
