# 🧪 Turion API - Test Credentials & Examples

**Generated**: 2026-02-09 20:15 UTC  
**Status**: ✅ API Ready for Testing

---

## 👤 Test User

```
Email:    test-1770668158@turion.dev
Password: password123
```

---

## 🏢 Test Tenant

```
Tenant ID:   55bd5ffd-4d4f-4580-a023-9524b8bd5086
Tenant Name: Test Company 1770668158
Tenant Slug: test-company-1770668158-8gyq73
Role:        owner
```

---

## 🔐 JWT Token (Valid for 7 days)

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzOTA5YzM4NC0wYWQxLTRhNzctYmNhZS00YWQ3MGM4MzFjOWYiLCJlbWFpbCI6InRlc3QtMTc3MDY2ODE1OEB0dXJpb24uZGV2IiwiaXNTdXBlckFkbWluIjpmYWxzZSwiaWF0IjoxNzcwNjY4MTU4LCJleHAiOjE3NzEyNzI5NTh9.***
```

---

## 🧪 Test Examples

### 1. Get Current User

```bash
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**
```json
{
  "id": "3909c384-0ad1-4a77-bcae-4ad70831c99f",
  "email": "test-1770668158@turion.dev",
  "isSuperAdmin": false,
  "memberships": [
    {
      "tenantId": "55bd5ffd-4d4f-4580-a023-9524b8bd5086",
      "tenantName": "Test Company 1770668158",
      "tenantSlug": "test-company-1770668158-8gyq73",
      "role": "owner"
    }
  ]
}
```

---

### 2. Get Stage Config (Atendimento)

```bash
curl -X GET "http://localhost:3000/api/tenants/55bd5ffd-4d4f-4580-a023-9524b8bd5086/config?stage=atendimento" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**
```json
{
  "tenantId": "55bd5ffd-4d4f-4580-a023-9524b8bd5086",
  "stage": "atendimento",
  "configJson": {
    "tone": "formal",
    "cta_style": "soft",
    "template_fallback": "Olá {name}, estamos processando. Tente novamente.",
    "guardrails": {
      "on": true,
      "max_tokens": 256,
      "blocked_topics": []
    },
    "questions": ["Qual o número do pedido?"]
  },
  "version": 1,
  "createdAt": "2026-02-08T18:52:36.914Z",
  "updatedAt": "2026-02-08T18:52:36.914Z"
}
```

---

### 3. Update Stage Config

```bash
curl -X PUT "http://localhost:3000/api/tenants/55bd5ffd-4d4f-4580-a023-9524b8bd5086/config?stage=atendimento" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "tone": "empathetic",
      "cta_style": "soft",
      "template_fallback": "Olá {name}, estamos aqui para ajudar!",
      "guardrails": {
        "on": true,
        "max_tokens": 256,
        "blocked_topics": []
      },
      "questions": [
        "Como posso ajudá-lo?",
        "Qual é seu pedido?",
        "Tem alguma dúvida?"
      ]
    }
  }'
```

---

### 4. Test Simulator (Core AI)

```bash
curl -X POST "http://localhost:3000/api/tenants/55bd5ffd-4d4f-4580-a023-9524b8bd5086/test" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "stage": "atendimento",
    "message_original": "Olá, preciso de ajuda com meu pedido",
    "name": "Maria",
    "origin": "whatsapp"
  }'
```

**Response:**
```json
{
  "reply": "Olá Maria! 👋 Ficarei feliz em ajudá-lo. Qual é o número do seu pedido?",
  "next_best_action": "await_response",
  "confidence": 0.92
}
```

> **Note**: Se o motor n8n estiver indisponível, retorna fallback:
> ```json
> {
>   "reply": "Olá {name}, estamos processando. Tente novamente.",
>   "next_best_action": "retry",
>   "confidence": 0.10
> }
> ```

---

### 5. Get Tenant Secret

```bash
curl -X POST "http://localhost:3000/api/tenants/55bd5ffd-4d4f-4580-a023-9524b8bd5086/secrets/rotate" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**
```json
{
  "id": "uuid",
  "tenantId": "55bd5ffd-4d4f-4580-a023-9524b8bd5086",
  "secret": "sk_test_abc123xyz789",
  "status": "active",
  "createdAt": "2026-02-09T20:15:00.000Z"
}
```

---

### 6. Get Usage Stats

```bash
curl -X GET "http://localhost:3000/api/tenants/55bd5ffd-4d4f-4580-a023-9524b8bd5086/usage" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**
```json
{
  "tenantId": "55bd5ffd-4d4f-4580-a023-9524b8bd5086",
  "requestsThisMonth": 5,
  "requestsLimit": 100,
  "createdAt": "2026-02-08T18:52:36.914Z",
  "updatedAt": "2026-02-09T20:15:00.000Z"
}
```

---

## 🔀 Available Stages

| Stage | Purpose | Tone | CTA Style |
|-------|---------|------|-----------|
| `atendimento` | Customer support | Empathetic | Soft |
| `cobranca` | Payment collection | Formal | Direct |
| `qualificacao` | Lead qualification | Casual | Urgent |

---

## ⚙️ Config Schema

```typescript
interface ConfigJsonV1 {
  tone: "formal" | "casual" | "empathetic";
  cta_style: "soft" | "direct" | "urgent";
  template_fallback: string;
  guardrails: {
    on: boolean;
    max_tokens: number;
    blocked_topics: string[];
  };
  questions: string[];
}
```

---

## 🧠 Simulator Response Contract

```typescript
interface SimulatorResponse {
  reply: string;                    // The AI response
  next_best_action: string;         // Suggested action (await_response, retry, escalate)
  confidence: number;               // 0.0 - 1.0 (1.0 = high confidence)
}
```

**Always returns HTTP 200**, even on error:
- **Success**: Real reply from motor, `confidence > 0.5`
- **Fallback**: `template_fallback` from stage config, `confidence = 0.10`

---

## 🔌 Integration Points

### Motor Webhook (n8n)

The simulator calls: `MOTOR_URL` from .env

```
POST http://172.17.0.1:5678/webhook/shpKwVVC9j0s8HAi/webhook/engine/run
```

**Request Body:**
```json
{
  "tenant_id": "55bd5ffd-4d4f-4580-a023-9524b8bd5086",
  "stage": "atendimento",
  "request_id": "uuid",
  "message_original": "Olá, preciso de ajuda",
  "name": "Maria",
  "origin": "whatsapp",
  "config": { ... stage config ... }
}
```

**Expected Response:**
```json
{
  "reply": "string",
  "next_best_action": "string",
  "confidence": 0.0
}
```

---

## 📊 Troubleshooting

### JWT Token Expired?
```bash
# Re-login
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-1770668158@turion.dev",
    "password": "password123"
  }'
```

### Simulator Returns Fallback?
- Check if motor URL is reachable: `curl http://172.17.0.1:5678`
- Check API logs: `docker compose logs api`
- Verify MOTOR_URL in `.env`

### Database Connection Issues?
```bash
# Test PostgreSQL connection
psql "$DATABASE_URL"

# Check Neon dashboard for active connections
```

---

## 🚀 Next Steps

1. **Test all endpoints** using examples above
2. **Verify motor integration** (simulator response)
3. **Implement webhook receiver** for n8n responses
4. **Setup production credentials** (replace test user)
5. **Configure DNS/SSL** if needed

---

**API Base URL**: `http://54.232.134.140:3000/api`  
**Frontend**: `https://master.turion-web.pages.dev`  
**Database**: `Neon PostgreSQL`
