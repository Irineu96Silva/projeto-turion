import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { v4 as uuidv4 } from 'crypto';
import * as schema from '../db/schema';
import { users, tenants, memberships, plans, stageConfigs } from '../db/schema';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  const db = drizzle(client, { schema });

  console.log('🌱 Seeding test data...\n');

  try {
    // 1. Create test user
    console.log('👤 Creating test user...');
    const passwordHash = await bcrypt.hash('password123', 12);
    const testUser = await db
      .insert(users)
      .values({
        id: uuidv4(),
        email: 'test@turion.dev',
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
      .then((r) => r[0])
      .catch(() => {
        console.log('  ⚠️  User already exists');
        return null;
      });

    if (testUser) {
      console.log(`  ✅ User created: ${testUser.email} (ID: ${testUser.id})`);
    }

    // 2. Create test tenant
    console.log('\n🏢 Creating test tenant...');
    const tenantId = uuidv4();
    const testTenant = await db
      .insert(tenants)
      .values({
        id: tenantId,
        name: 'Test Company',
        slug: `test-company-${Date.now()}`,
        planId: '', // Will be set after plans
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
      .then((r) => r[0])
      .catch(() => {
        console.log('  ⚠️  Tenant already exists');
        return null;
      });

    if (testTenant) {
      console.log(
        `  ✅ Tenant created: ${testTenant.name} (ID: ${testTenant.id})`,
      );
    }

    // 3. Get or create Free plan
    console.log('\n💰 Ensuring Free plan exists...');
    let freePlan = await db
      .select()
      .from(plans)
      .where((plan) => plan.slug === 'free')
      .then((r) => r[0]);

    if (!freePlan) {
      freePlan = await db
        .insert(plans)
        .values({
          id: uuidv4(),
          name: 'Free',
          slug: 'free',
          maxTenants: 1,
          maxRequestsMonth: 100,
          features: { support: 'community' },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .then((r) => r[0]);
      console.log(`  ✅ Free plan created`);
    } else {
      console.log(`  ✅ Free plan exists`);
    }

    // 4. Link tenant to plan
    if (testTenant && freePlan) {
      await db
        .update(tenants)
        .set({ planId: freePlan.id })
        .where((t) => t.id === testTenant.id)
        .catch(() => {
          // Already set
        });
    }

    // 5. Create membership
    if (testUser && testTenant) {
      console.log('\n🔗 Creating membership...');
      const existingMembership = await db
        .select()
        .from(memberships)
        .where((m) => m.userId === testUser.id && m.tenantId === testTenant.id)
        .then((r) => r[0]);

      if (!existingMembership) {
        await db
          .insert(memberships)
          .values({
            id: uuidv4(),
            userId: testUser.id,
            tenantId: testTenant.id,
            role: 'owner',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .catch(() => {
            // Already exists
          });
        console.log('  ✅ Membership created (owner)');
      } else {
        console.log('  ⚠️  Membership already exists');
      }
    }

    // 6. Create stage configs
    if (testTenant) {
      console.log('\n⚙️  Creating stage configurations...');

      const stages = [
        {
          stage: 'atendimento',
          config: {
            tone: 'empathetic',
            cta_style: 'soft',
            template_fallback:
              'Olá {name}, estamos processando sua solicitação. Por favor tente novamente em instantes.',
            guardrails: {
              on: true,
              max_tokens: 256,
              blocked_topics: [],
            },
            questions: [
              'Como posso ajudá-lo?',
              'Qual é sua dúvida?',
              'Qual é o assunto?',
            ],
          },
        },
        {
          stage: 'cobranca',
          config: {
            tone: 'formal',
            cta_style: 'direct',
            template_fallback:
              'Prezado {name}, temos um saldo pendente em sua conta. Por favor entre em contato conosco.',
            guardrails: {
              on: true,
              max_tokens: 256,
              blocked_topics: [],
            },
            questions: [
              'Qual é o número do seu pedido?',
              'Quando você fez a compra?',
            ],
          },
        },
        {
          stage: 'qualificacao',
          config: {
            tone: 'casual',
            cta_style: 'urgent',
            template_fallback:
              'Oi {name}! Gostaríamos de saber mais sobre suas necessidades. Pode responder rapidinho?',
            guardrails: {
              on: false,
              max_tokens: 512,
              blocked_topics: [],
            },
            questions: [
              'Qual é seu orçamento?',
              'Quando você precisa?',
              'Qual é seu principal desafio?',
            ],
          },
        },
      ];

      for (const stageData of stages) {
        const existingConfig = await db
          .select()
          .from(stageConfigs)
          .where(
            (sc) =>
              sc.tenantId === testTenant.id && sc.stage === stageData.stage,
          )
          .then((r) => r[0]);

        if (!existingConfig) {
          await db
            .insert(stageConfigs)
            .values({
              id: uuidv4(),
              tenantId: testTenant.id,
              stage: stageData.stage,
              configJson: stageData.config,
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .catch(() => {
              // Already exists
            });
          console.log(`  ✅ Stage config created: ${stageData.stage}`);
        } else {
          console.log(`  ⚠️  Stage config exists: ${stageData.stage}`);
        }
      }
    }

    console.log('\n✨ Seeding completed!\n');
    console.log('📝 Test Credentials:');
    console.log('   Email: test@turion.dev');
    console.log('   Password: password123');
    console.log('\n🏢 Test Tenant:');
    if (testTenant) {
      console.log(`   ID: ${testTenant.id}`);
      console.log(`   Name: ${testTenant.name}`);
      console.log(`   Slug: ${testTenant.slug}`);
    }
    console.log('\n🚀 Next steps:');
    console.log(
      '   1. POST /api/auth/login with above credentials',
    );
    console.log('   2. Use JWT token for authenticated requests');
    console.log(`   3. Test simulator: POST /api/tenants/{tenantId}/test`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }

  await client.end();
}

main();
