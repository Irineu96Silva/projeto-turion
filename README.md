# Turion — SaaS Multi-Tenant Control Plane

Control Plane + API para integração com Motor V1 (n8n + Ollama).

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | NestJS (Node.js) |
| DB | PostgreSQL (Neon/Supabase) |
| ORM | Drizzle ORM (node-postgres) |
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Vue 3 + Quasar |
| Schemas | Zod (compartilhado) |
| Motor V1 | n8n + Ollama (VPS) |

## Estrutura

```
turion/
├── apps/api/          # NestJS API
├── apps/web/          # Quasar/Vue frontend
├── packages/shared/   # Schemas, DTOs, utils compartilhados
├── drizzle/           # Migration files (gerado)
└── drizzle.config.ts  # Drizzle Kit config
```

## Setup

### Pré-requisitos
- Node.js 20+
- pnpm 9+
- PostgreSQL (Neon ou Supabase free tier)

### Instalação

```bash
pnpm install
cp .env.example .env
# Edite .env com suas credenciais
```

### Variáveis de Ambiente

```env
DATABASE_URL=postgresql://user:pass@host:5432/turion
JWT_SECRET=<random-64-chars>
MASTER_KEY=<64-hex-chars>  # 32 bytes para AES-256-GCM
MOTOR_URL=http://<VPS-IP>:5678/webhook/shpKwVVC9j0s8HAi/webhook/engine/run
MOTOR_TIMEOUT_MS=10000
PORT=3000
FRONTEND_URL=http://localhost:9000
```

### Gerar MASTER_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Migrations

```bash
# Gerar migration SQL a partir do schema
npx drizzle-kit generate

# Aplicar migrations ao banco
npx drizzle-kit migrate

# Push direto (dev rápido)
npx drizzle-kit push
```

### Executar

```bash
# API (porta 3000)
pnpm --filter @turion/api dev

# Frontend (porta 9000)
pnpm --filter @turion/web dev

# Testes
pnpm --filter @turion/api test
```

## Endpoints da API

### Auth
```bash
# Registrar usuário + tenant
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"12345678","name":"João","tenantName":"Minha Empresa"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"12345678"}'

# Dados do usuário
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

### Config por Stage
```bash
# Obter config ativa
curl "http://localhost:3000/api/tenants/<TENANT_ID>/config?stage=atendimento" \
  -H "Authorization: Bearer <TOKEN>"

# Atualizar config
curl -X PUT "http://localhost:3000/api/tenants/<TENANT_ID>/config?stage=atendimento" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "tone": "formal",
      "cta_style": "soft",
      "template_fallback": "Olá {name}, estamos processando. Tente novamente.",
      "guardrails": {"on": true, "max_tokens": 256, "blocked_topics": []},
      "questions": ["Qual o número do pedido?"]
    }
  }'
```

### Secrets (Rotação)
```bash
# Rotacionar secret (retorna plaintext UMA vez)
curl -X POST "http://localhost:3000/api/tenants/<TENANT_ID>/secrets/rotate" \
  -H "Authorization: Bearer <TOKEN>"
```

### Simulador (/test)
```bash
# Testar mensagem no motor
curl -X POST "http://localhost:3000/api/tenants/<TENANT_ID>/test" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "stage": "atendimento",
    "message_original": "Olá, preciso de ajuda com meu pedido",
    "name": "Maria",
    "origin": "whatsapp"
  }'

# Resposta SEMPRE HTTP 200:
# {"reply":"...","next_best_action":"...","confidence":0.85}
# Em falha: {"reply":"<fallback>","next_best_action":"retry","confidence":0.10}
```

## Contrato de Resposta (Imutável)

O endpoint `/test` **sempre** retorna HTTP 200 com:

```json
{
  "reply": "string",
  "next_best_action": "string",
  "confidence": 0.0
}
```

- **Sucesso:** reply do motor, confidence real
- **Fallback** (timeout/erro): reply = `template_fallback` do stage, confidence = `0.10`

## Contrato Motor V1

### Request (POST /engine/run)
```json
{
  "tenant_id": "uuid",
  "stage": "atendimento|cobranca|qualificacao",
  "request_id": "uuid",
  "message_original": "string",
  "name": "string?",
  "origin": "string?",
  "config": { "...ConfigJsonV1" }
}
```

### Headers
```
x-signature: <HMAC-SHA256 hex>
x-signature-version: v1
```

### HMAC v1 Canonical String
```
tenant_id|stage|request_id|sha256(message_original)|sha256(stableStringify(config))
```

## Config JSON V1 (Schema Travado)

```json
{
  "tone": "formal|casual|empathetic",
  "cta_style": "soft|direct|urgent",
  "template_fallback": "Olá {name}, tente novamente...",
  "guardrails": {
    "on": true,
    "max_tokens": 256,
    "blocked_topics": ["string"]
  },
  "questions": ["string"]
}
```

## Rotação de Secret

1. `POST /api/tenants/:id/secrets/rotate` → recebe plaintext
2. Copie o secret e configure no Motor V1 (TENANT_SECRETS_JSON na VPS)
3. A partir desse momento, o simulador usará o novo secret para assinar HMAC
4. O secret anterior continua armazenado mas marcado com `rotated_at`

## Banco de Dados (7 tabelas)

| Tabela | Função |
|--------|--------|
| `tenants` | Organizações/empresas |
| `users` | Usuários com senha hash |
| `memberships` | Vínculo user↔tenant + role |
| `stage_configs` | Config versionada por stage |
| `tenant_secrets` | Secrets encriptados (AES-256-GCM) |
| `audit_logs` | Log de mudanças |
| `execution_logs` | Log de execuções do simulador |

## Stages MVP

- `atendimento` — Atendimento ao cliente
- `cobranca` — Cobrança
- `qualificacao` — Qualificação de leads
