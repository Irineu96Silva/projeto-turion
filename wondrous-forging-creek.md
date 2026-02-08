# CORE v1 — Control Plane (Plano de Implementação)

## Contexto

O MVP base já está completo (10 commits): auth, multi-tenant config CRUD, secrets AES-256-GCM, HMAC v1, simulator com Motor V1, execution_logs, 32 testes unitários, e frontend Quasar stub. Agora precisamos do **Control Plane** — a camada de gestão que permite um Super Admin gerenciar planos, provisionar tenants completos, e controlar ciclo de vida (ativar/suspender/cancelar) com gating no produto.

**O que NÃO entra agora:** Stripe, RBAC granular, portal do cliente, métricas avançadas.

---

## Resumo das Mudanças

| Área | O que muda |
|------|-----------|
| Schema (Drizzle) | Nova tabela `plans`, nova tabela `tenant_usage`, novo enum `tenant_status`, colunas em `tenants` (planId, status, activatedAt, suspendedAt), coluna em `users` (isSuperAdmin), `audit_logs.tenantId` → nullable |
| Auth | JWT payload ganha `isSuperAdmin`, novo `SuperAdminGuard`, decorator `@IsSuperAdmin()` |
| AuditService | `tenantId` passa a ser opcional (ações no nível de plano não têm tenant) |
| Core Module (NOVO) | CRUD plans, provisioning tenant, governance (activate/suspend/cancel), listagem |
| Simulator | Gating check antes do fluxo: verifica status do tenant + limite mensal de uso |
| Frontend | 2 páginas novas: `CorePlansPage.vue`, `CoreTenantsPage.vue` com tabelas + ações |
| Seed | Script para popular 3 planos padrão (free, starter, pro) |

---

## Commit 1 — Schema Changes

### Arquivos modificados:
- `packages/shared/src/db/schema.ts`
- `packages/shared/src/enums/index.ts`
- `packages/shared/src/dto/index.ts`

### Arquivos novos:
- `packages/shared/src/enums/tenant-status.enum.ts`
- `packages/shared/src/dto/core.dto.ts`

### Detalhes:

**1. Novo enum `tenant_status`:**
```
packages/shared/src/enums/tenant-status.enum.ts
export const TENANT_STATUSES = ['active', 'suspended', 'cancelled'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];
```

**2. Nova tabela `plans`:**
```sql
plans (
  id uuid PK default random,
  name text NOT NULL,            -- "Free", "Starter", "Pro"
  slug varchar(63) UNIQUE NOT NULL,
  max_tenants int,               -- NULL = ilimitado
  max_requests_month int NOT NULL DEFAULT 500,
  features jsonb DEFAULT '{}',   -- feature flags futuras
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
```

**3. Nova tabela `tenant_usage`:**
```sql
tenant_usage (
  id uuid PK,
  tenant_id uuid FK → tenants.id,
  month varchar(7) NOT NULL,     -- "2025-06"
  request_count int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, month)
)
```

**4. Alterar tabela `tenants`:**
- Adicionar: `plan_id uuid FK → plans.id` (nullable inicialmente, depois migrar)
- Adicionar: `status tenant_status_enum DEFAULT 'active'`
- Adicionar: `activated_at timestamptz`
- Adicionar: `suspended_at timestamptz`
- Manter coluna `plan` (enum legada) — deprecar depois

**5. Alterar tabela `users`:**
- Adicionar: `is_super_admin boolean DEFAULT false`

**6. Alterar tabela `audit_logs`:**
- `tenant_id` → nullable (ações de plano não têm tenant)

**7. Atualizar relations em schema.ts:**
- `tenants` ↔ `plans` (many-to-one)
- `tenants` ↔ `tenant_usage` (one-to-many)
- `plans` ↔ `tenants` (one-to-many)

**8. Novos DTOs Zod (`packages/shared/src/dto/core.dto.ts`):**
- `CreatePlanSchema` — { name, slug, max_tenants?, max_requests_month, features? }
- `UpdatePlanSchema` — partial do Create
- `ProvisionTenantSchema` — { name, ownerEmail, ownerPassword, planId }
- `UpdateTenantStatusSchema` — { status: 'active' | 'suspended' | 'cancelled' }

**Verificação:** `pnpm --filter @turion/shared build` compila sem erros.

---

## Commit 2 — Super Admin (Auth layer)

### Arquivos modificados:
- `apps/api/src/auth/decorators/current-user.decorator.ts` — `JwtPayload` ganha `isSuperAdmin: boolean`
- `apps/api/src/auth/auth.service.ts` — `signToken()` inclui `isSuperAdmin` no payload; `register()` busca do DB; `getMe()` retorna `isSuperAdmin`
- `apps/api/src/auth/strategies/jwt.strategy.ts` — extrair `isSuperAdmin` do payload

### Arquivos novos:
- `apps/api/src/auth/guards/super-admin.guard.ts`
- `apps/api/src/auth/decorators/is-super-admin.decorator.ts`

### Detalhes:

**JwtPayload atualizado:**
```ts
export interface JwtPayload {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
}
```

**SuperAdminGuard:** (reutiliza padrão do TenantMembershipGuard)
```ts
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Super Admin access required');
    }
    return true;
  }
}
```

**signToken modificado:**
```ts
private signToken(userId: string, email: string, isSuperAdmin: boolean): AuthTokenResponse {
  const payload = { sub: userId, email, isSuperAdmin };
  return { access_token: this.jwtService.sign(payload) };
}
```

**AuthMeResponse atualizado:**
```ts
// em packages/shared/src/dto/auth.dto.ts
export interface AuthMeResponse {
  id: string;
  email: string;
  isSuperAdmin: boolean;  // NOVO
  memberships: Array<{...}>;
}
```

**Verificação:** Login retorna JWT com `isSuperAdmin: false`; endpoint `/auth/me` inclui campo.

---

## Commit 3 — AuditService tenantId opcional

### Arquivos modificados:
- `packages/shared/src/db/schema.ts` — `audit_logs.tenantId` remove `.notNull()`
- `apps/api/src/audit/audit.service.ts` — `tenantId` no params vira `tenantId?: string`

### Detalhes:
Ações do Core (criar plano, atualizar plano) são no nível global, sem tenant. O audit_log precisa suportar `tenantId = null` para essas entradas.

**Verificação:** AuditService.log({ actorUserId, action: 'plan.create', entity: 'plan', entityId: '...' }) grava sem tenantId.

---

## Commit 4 — Core Module (API)

### Arquivos novos:
- `apps/api/src/core/core.module.ts`
- `apps/api/src/core/plans/plans.controller.ts`
- `apps/api/src/core/plans/plans.service.ts`
- `apps/api/src/core/tenants/core-tenants.controller.ts`
- `apps/api/src/core/tenants/core-tenants.service.ts`

### Arquivos modificados:
- `apps/api/src/app.module.ts` — importar `CoreModule`

### Endpoints:

**Plans CRUD** (todos `@UseGuards(JwtAuthGuard, SuperAdminGuard)`):
| Método | Rota | Ação |
|--------|------|------|
| GET | `/api/core/plans` | Listar todos os planos |
| GET | `/api/core/plans/:planId` | Detalhe de um plano |
| POST | `/api/core/plans` | Criar plano |
| PATCH | `/api/core/plans/:planId` | Atualizar plano |
| DELETE | `/api/core/plans/:planId` | Soft-delete (is_active=false) |

**Tenant Management** (todos `@UseGuards(JwtAuthGuard, SuperAdminGuard)`):
| Método | Rota | Ação |
|--------|------|------|
| GET | `/api/core/tenants` | Listar tenants com plano e status |
| GET | `/api/core/tenants/:tenantId` | Detalhe de um tenant |
| POST | `/api/core/tenants` | Provisionar novo tenant completo |
| PATCH | `/api/core/tenants/:tenantId/status` | Alterar status (activate/suspend/cancel) |

### Provisioning flow (POST `/api/core/tenants`):
```
Input: { name, ownerEmail, ownerPassword, planId }
Transaction:
  1. Criar user (ou buscar existente por email)
  2. Criar tenant com planId + status='active'
  3. Criar membership (owner)
  4. Criar tenant_secret (randomBytes + encrypt)
  5. Criar 3 stage_configs (atendimento/cobranca/qualificacao) com defaults
  6. Criar tenant_usage para mês atual (count=0)
Return: { tenant, owner, secret (plaintext 1x) }
```

**Config defaults para provisioning** (constante compartilhada):
```ts
const DEFAULT_CONFIG: ConfigJsonV1 = {
  tone: 'formal',
  cta_style: 'soft',
  template_fallback: 'Olá {name}, não conseguimos processar sua solicitação. Tente novamente.',
  guardrails: { on: true, max_tokens: 256, blocked_topics: [] },
  questions: [],
};
```

### Status management (PATCH `/api/core/tenants/:tenantId/status`):
```
Input: { status: 'active' | 'suspended' | 'cancelled' }
Regras:
  - active → suspended ✓ (set suspended_at)
  - active → cancelled ✓ (set suspended_at)
  - suspended → active ✓ (set activated_at, clear suspended_at)
  - suspended → cancelled ✓
  - cancelled → active ✓ (reativação, set activated_at)
  - cancelled → suspended ✗ (não faz sentido)
Audit: grava ação com diff {old_status, new_status}
```

**Verificação:** POST /api/core/plans cria plano; POST /api/core/tenants provisiona completo; PATCH status funciona com audit.

---

## Commit 5 — Usage Tracking + Gating

### Arquivos novos:
- `apps/api/src/core/usage/usage.service.ts`

### Arquivos modificados:
- `apps/api/src/core/core.module.ts` — exportar UsageService
- `apps/api/src/simulator/simulator.module.ts` — importar CoreModule
- `apps/api/src/simulator/simulator.service.ts` — injetar UsageService, adicionar gating check

### Detalhes:

**UsageService:**
```ts
@Injectable()
export class UsageService {
  // Incrementa contador mensal (upsert: insert on conflict update +1)
  async incrementUsage(tenantId: string): Promise<void>;

  // Retorna { count, limit, remaining }
  async getUsage(tenantId: string): Promise<{ count: number; limit: number; remaining: number }>;

  // Verifica status + limite
  async checkGating(tenantId: string): Promise<{ allowed: boolean; reason?: string }>;
}
```

**Gating no SimulatorService.runTest()** (inserido ANTES do try/catch):
```ts
async runTest(tenantId: string, dto: SimulatorRequestDto): Promise<SimulatorResponseDto> {
  const startTime = Date.now();
  const requestId = randomUUID();
  const stage = dto.stage as Stage;

  // ── GATING CHECK ──
  const gating = await this.usageService.checkGating(tenantId);
  if (!gating.allowed) {
    return {
      reply: gating.reason ?? 'Tenant não autorizado.',
      next_best_action: 'contact_support',
      confidence: 0,
    };
  }

  // ... resto do fluxo (try/catch/motor)

  // Após resposta bem-sucedida (ou fallback), incrementar uso
  await this.usageService.incrementUsage(tenantId).catch(() => {});

  return response;
}
```

**checkGating logic:**
1. Buscar tenant com join em plans
2. Se `tenant.status !== 'active'` → `{ allowed: false, reason: 'Tenant suspenso/cancelado' }`
3. Buscar tenant_usage do mês atual
4. Se `usage.request_count >= plan.max_requests_month` → `{ allowed: false, reason: 'Limite mensal excedido' }`
5. Caso contrário → `{ allowed: true }`

**Verificação:** Tenant suspenso recebe bloqueio; tenant com limite estourado recebe bloqueio; tenant ativo passa.

---

## Commit 6 — Core UI (Quasar)

### Arquivos novos:
- `apps/web/src/pages/core/CorePlansPage.vue`
- `apps/web/src/pages/core/CoreTenantsPage.vue`
- `apps/web/src/layouts/CoreLayout.vue`

### Arquivos modificados:
- `apps/web/src/router/index.ts` — rotas `/core/plans` e `/core/tenants`
- `apps/web/src/stores/auth.store.ts` — decodificar JWT, computed `isSuperAdmin`

### Detalhes:

**auth.store.ts — decodificar JWT:**
```ts
const isSuperAdmin = computed(() => {
  if (!token.value) return false;
  try {
    const payload = JSON.parse(atob(token.value.split('.')[1]));
    return payload.isSuperAdmin === true;
  } catch { return false; }
});
```

**Router — novas rotas:**
```ts
{
  path: '/core',
  component: () => import('../layouts/CoreLayout.vue'),
  meta: { requiresAuth: true, requiresSuperAdmin: true },
  children: [
    { path: 'plans', name: 'core-plans', component: () => import('../pages/core/CorePlansPage.vue') },
    { path: 'tenants', name: 'core-tenants', component: () => import('../pages/core/CoreTenantsPage.vue') },
  ],
},
```

**Router guard — super admin check:**
```ts
router.beforeEach((to) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) return { name: 'login' };
  if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) return { name: 'dashboard' };
});
```

**CorePlansPage.vue:**
- Tabela (q-table) listando planos: name, slug, max_requests_month, is_active, tenant_count
- Botão "Novo Plano" → dialog com form (name, slug, max_requests_month)
- Botão "Editar" em cada linha → dialog de edição
- Botão "Desativar/Ativar" → soft-delete toggle

**CoreTenantsPage.vue:**
- Tabela listando tenants: name, slug, plan_name, status, created_at, usage_this_month
- Botão "Novo Tenant" → dialog com form (name, ownerEmail, ownerPassword, planId select)
- Chips de status coloridos (active=green, suspended=yellow, cancelled=red)
- Dropdown de ações por tenant: Ativar, Suspender, Cancelar

**Verificação:** Navegar para `/core/plans` e `/core/tenants` mostra tabelas e ações.

---

## Commit 7 — Seed Script + Testes

### Arquivos novos:
- `apps/api/src/core/seed-plans.ts`
- `apps/api/test/unit/core-tenants.service.spec.ts`
- `apps/api/test/unit/usage.service.spec.ts`

### seed-plans.ts:
Script standalone que insere 3 planos padrão:
```ts
const DEFAULT_PLANS = [
  { name: 'Free', slug: 'free', maxRequestsMonth: 500, features: {} },
  { name: 'Starter', slug: 'starter', maxRequestsMonth: 5000, features: {} },
  { name: 'Pro', slug: 'pro', maxRequestsMonth: 50000, features: {} },
];
// Upsert on conflict(slug) do nothing
```

Executar via: `npx tsx apps/api/src/core/seed-plans.ts`

### Testes:
- **core-tenants.service.spec.ts:** Provisioning cria user+tenant+membership+secret+3configs+usage; status transitions válidas e inválidas
- **usage.service.spec.ts:** checkGating bloqueia suspended; checkGating bloqueia excesso; incrementUsage funciona

**Verificação:** `pnpm turbo run test` — todos passam.

---

## Arquivos — Resumo Completo

### Novos (14 arquivos):
```
packages/shared/src/enums/tenant-status.enum.ts
packages/shared/src/dto/core.dto.ts
apps/api/src/auth/guards/super-admin.guard.ts
apps/api/src/auth/decorators/is-super-admin.decorator.ts
apps/api/src/core/core.module.ts
apps/api/src/core/plans/plans.controller.ts
apps/api/src/core/plans/plans.service.ts
apps/api/src/core/tenants/core-tenants.controller.ts
apps/api/src/core/tenants/core-tenants.service.ts
apps/api/src/core/usage/usage.service.ts
apps/api/src/core/seed-plans.ts
apps/web/src/pages/core/CorePlansPage.vue
apps/web/src/pages/core/CoreTenantsPage.vue
apps/web/src/layouts/CoreLayout.vue
```

### Modificados (14 arquivos):
```
packages/shared/src/db/schema.ts           — plans, tenant_usage, tenantStatus enum, alter tenants/users/audit_logs
packages/shared/src/enums/index.ts         — re-export tenant-status
packages/shared/src/dto/index.ts           — re-export core DTOs
packages/shared/src/dto/auth.dto.ts        — AuthMeResponse ganha isSuperAdmin
apps/api/src/app.module.ts                 — import CoreModule
apps/api/src/auth/auth.service.ts          — signToken c/ isSuperAdmin, getMe retorna flag
apps/api/src/auth/decorators/current-user.decorator.ts — JwtPayload + isSuperAdmin
apps/api/src/auth/strategies/jwt.strategy.ts            — extrair isSuperAdmin
apps/api/src/audit/audit.service.ts        — tenantId opcional
apps/api/src/simulator/simulator.module.ts — importar CoreModule
apps/api/src/simulator/simulator.service.ts — gating + usage
apps/web/src/router/index.ts              — rotas /core
apps/web/src/stores/auth.store.ts         — isSuperAdmin computed
apps/api/test/unit/*.spec.ts              — novos testes
```

---

## Verificação End-to-End

1. `pnpm --filter @turion/shared build` — compila com novas tabelas e DTOs
2. `pnpm drizzle-kit push` — aplica schema ao Neon (plans, tenant_usage, alter tenants/users/audit_logs)
3. `npx tsx apps/api/src/core/seed-plans.ts` — 3 planos criados
4. Marcar um user como super admin: `UPDATE users SET is_super_admin = true WHERE email = '...'`
5. Login → JWT agora contém `isSuperAdmin: true`
6. `GET /api/core/plans` → lista 3 planos
7. `POST /api/core/plans` → cria plano customizado
8. `POST /api/core/tenants` → provisiona tenant completo (user+tenant+membership+secret+3configs+usage)
9. `PATCH /api/core/tenants/:id/status` com `{status:'suspended'}` → tenant suspenso
10. `POST /api/tenants/:id/test` em tenant suspenso → bloqueado pelo gating
11. Reativar tenant → `POST /api/tenants/:id/test` funciona
12. `pnpm turbo run test` — todos os testes passam
13. `pnpm --filter @turion/web dev` → `/core/plans` e `/core/tenants` renderizam
