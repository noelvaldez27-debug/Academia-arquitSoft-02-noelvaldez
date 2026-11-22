# ── Etapa 1: build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copiar manifiestos e instalar TODAS las dependencias (incluye devDependencies)
COPY package.json package-lock.json ./
RUN npm ci

# Copiar el código fuente y compilar
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Etapa 2: runtime ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Copiar manifiestos e instalar SOLO dependencias de producción
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiar el artefacto compilado desde la etapa build
COPY --from=build /app/dist ./dist

# Copiar migraciones SQL
COPY migraciones/ ./migraciones/

RUN mkdir -p /app/uploads && chown node:node /app/uploads

# Correr como usuario no root (node viene incluido en la imagen node:alpine)
USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
