import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  numeric,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { ConfigJsonV1 } from '../dto/config.dto';

// ── Enums ──────────────────────────────────────────────
export const planEnum = pgEnum('plan', ['free', 'starter', 'pro']);
export const roleEnum = pgEnum('role', ['owner', 'admin', 'member']);
export const stageEnum = pgEnum('stage', ['atendimento', 'cobranca', 'qualificacao']);

// ── Tables ─────────────────────────────────────────────
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 63 }).notNull().unique(),
  plan: planEnum('plan').default('free').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('uq_membership').on(table.tenantId, table.userId)],
);

export const stageConfigs = pgTable('stage_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  stage: stageEnum('stage').notNull(),
  configVersion: integer('config_version').notNull().default(1),
  configJson: jsonb('config_json').notNull().$type<ConfigJsonV1>(),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tenantSecrets = pgTable('tenant_secrets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  secretEnc: text('secret_enc').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  actorUserId: uuid('actor_user_id')
    .notNull()
    .references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: uuid('entity_id'),
  diffJson: jsonb('diff_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const executionLogs = pgTable('execution_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  requestId: uuid('request_id').notNull(),
  stage: stageEnum('stage').notNull(),
  latencyMs: integer('latency_ms'),
  confidence: numeric('confidence', { precision: 4, scale: 2 }),
  fallback: boolean('fallback').notNull().default(false),
  errorCode: text('error_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  messageRedacted: text('message_redacted'),
  responseJson: jsonb('response_json'),
});

// ── Relations ──────────────────────────────────────────
export const tenantsRelations = relations(tenants, ({ many }) => ({
  memberships: many(memberships),
  stageConfigs: many(stageConfigs),
  tenantSecrets: many(tenantSecrets),
  auditLogs: many(auditLogs),
  executionLogs: many(executionLogs),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  tenant: one(tenants, { fields: [memberships.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const stageConfigsRelations = relations(stageConfigs, ({ one }) => ({
  tenant: one(tenants, { fields: [stageConfigs.tenantId], references: [tenants.id] }),
}));

export const tenantSecretsRelations = relations(tenantSecrets, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantSecrets.tenantId], references: [tenants.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [auditLogs.tenantId], references: [tenants.id] }),
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
}));

export const executionLogsRelations = relations(executionLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [executionLogs.tenantId], references: [tenants.id] }),
}));
