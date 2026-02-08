import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from '../db/schema';
import { plans, users } from '../db/schema';
import { hash } from 'bcryptjs';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

if (!process.env.DATABASE_URL) {
  // Try loading from root if running from apps/api
  dotenv.config({ path: '../../.env' });
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const main = async () => {
  console.log('🌱 Seeding database...');

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  await client.connect();
  const db = drizzle(client, { schema });

  try {
    // 1. Seed Plans
    console.log('Seeding plans...');
    const existingPlans = await db.select().from(plans);
    const plansToCreate = [
      {
        name: 'Free',
        slug: 'free',
        maxTenants: 1,
        maxRequestsMonth: 100,
        features: { support: 'community' },
        isActive: true,
      },
      {
        name: 'Pro',
        slug: 'pro',
        maxTenants: 5,
        maxRequestsMonth: 5000,
        features: { support: 'email' },
        isActive: true,
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        maxTenants: null, // Unlimited
        maxRequestsMonth: 100000,
        features: { support: 'priority' },
        isActive: true,
      },
    ];

    for (const p of plansToCreate) {
      const exists = existingPlans.find((ep) => ep.slug === p.slug);
      if (!exists) {
        await db.insert(plans).values(p as any);
        console.log(`Created plan: ${p.name}`);
      } else {
        console.log(`Plan already exists: ${p.name}`);
      }
    }

    // 2. Seed Super Admin
    console.log('Seeding super admin...');
    const adminEmail = 'admin@turion.tech';
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.email, adminEmail),
    });

    if (!existingAdmin) {
      const passwordHash = await hash('admin123', 10);
      await db.insert(users).values({
        email: adminEmail,
        passwordHash,
        isSuperAdmin: true,
      });
      console.log(`Created super admin: ${adminEmail} (password: admin123)`);
    } else {
      console.log(`Super admin already exists: ${adminEmail}`);
      // Ensure existing admin is super admin
      if (!existingAdmin.isSuperAdmin) {
        await db
          .update(users)
          .set({ isSuperAdmin: true })
          .where(eq(users.email, adminEmail));
        console.log(`Promoted ${adminEmail} to super admin`);
      }
    }

    console.log('✅ Seeding complete.');
  } catch (error) {
    console.log('❌ Seeding failed (log):', error);
    console.error('❌ Seeding failed (error):', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

main();
