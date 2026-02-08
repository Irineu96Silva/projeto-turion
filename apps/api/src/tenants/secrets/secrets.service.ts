import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tenantSecrets } from '@turion/shared';
import { DRIZZLE } from '../../database/drizzle.token';
import { encrypt, decrypt, parseMasterKey } from './crypto.util';
import type * as schema from '@turion/shared';
import type { Env } from '../../config/env.validation';

@Injectable()
export class SecretsService {
  private readonly masterKey: Buffer;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    config: NestConfigService<Env, true>,
  ) {
    this.masterKey = parseMasterKey(config.get('MASTER_KEY', { infer: true }));
  }

  /**
   * Generate a new secret, encrypt it, store it, and return the plaintext ONCE.
   */
  async rotateSecret(tenantId: string): Promise<{ secret: string; createdAt: Date }> {
    const plaintext = randomBytes(32).toString('hex');
    const secretEnc = encrypt(plaintext, this.masterKey);

    const [row] = await this.db
      .insert(tenantSecrets)
      .values({
        tenantId,
        secretEnc,
      })
      .returning({ id: tenantSecrets.id, createdAt: tenantSecrets.createdAt });

    // Mark previous secrets as rotated
    await this.db
      .update(tenantSecrets)
      .set({ rotatedAt: new Date() })
      .where(eq(tenantSecrets.tenantId, tenantId));

    return { secret: plaintext, createdAt: row.createdAt };
  }

  /**
   * Get the latest decrypted secret for a tenant.
   * Throws if no secret exists.
   */
  async getDecryptedSecret(tenantId: string): Promise<string> {
    const [row] = await this.db
      .select({ secretEnc: tenantSecrets.secretEnc })
      .from(tenantSecrets)
      .where(eq(tenantSecrets.tenantId, tenantId))
      .orderBy(desc(tenantSecrets.createdAt))
      .limit(1);

    if (!row) {
      throw new BadRequestException(
        'No secret found for this tenant. Rotate a secret first via POST /tenants/:id/secrets/rotate',
      );
    }

    return decrypt(row.secretEnc, this.masterKey);
  }
}
