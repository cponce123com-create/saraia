# ===== Etapa 1: Build Backend =====
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --silent --omit=optional
COPY backend/src ./src
COPY backend/tsconfig.json ./
RUN npm run build

# ===== Etapa 2: Producción =====
FROM node:20-alpine AS runner
WORKDIR /app

# Copiar package.json e instalar solo producción
COPY --from=builder /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev --silent

# Copiar código compilado desde builder
COPY --from=builder /app/dist ./dist

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
