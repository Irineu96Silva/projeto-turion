# Build stage
FROM node:22-alpine AS builder

WORKDIR /build

# Instalar pnpm
RUN npm install -g pnpm

# Copiar arquivos de workspace
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Buildar a API
RUN pnpm --filter @turion/api build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar package.json do monorepo
COPY --from=builder /build/pnpm-workspace.yaml ./
COPY --from=builder /build/package.json ./
COPY --from=builder /build/pnpm-lock.yaml ./

# Copiar apps/api package.json
COPY --from=builder /build/apps/api/package.json ./apps/api/

# Copiar packages/shared package.json e dist
COPY --from=builder /build/packages/shared/package.json ./packages/shared/
COPY --from=builder /build/packages/shared/dist ./packages/shared/dist

# Copiar dist da API
COPY --from=builder /build/apps/api/dist ./apps/api/dist

# Instalar apenas dependências de produção
RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api', (r) => {if (r.statusCode !== 404) throw new Error(r.statusCode)})"

CMD ["node", "apps/api/dist/main.js"]
