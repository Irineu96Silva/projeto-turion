import { createHash, createHmac } from 'node:crypto';
import { stableStringify } from './stable-stringify';
import type { ConfigJsonV1 } from '../dto/config.dto';

/**
 * Build the canonical string for HMAC v1 signing.
 * Format: tenant_id|stage|request_id|sha256(message_original)|sha256(stableStringify(config))
 */
export function buildCanonical(
  tenantId: string,
  stage: string,
  requestId: string,
  messageOriginal: string,
  config: ConfigJsonV1,
): string {
  const msgHash = createHash('sha256').update(messageOriginal, 'utf8').digest('hex');
  const configHash = createHash('sha256').update(stableStringify(config), 'utf8').digest('hex');
  return `${tenantId}|${stage}|${requestId}|${msgHash}|${configHash}`;
}

/**
 * Sign the canonical string with HMAC-SHA256 using the tenant secret.
 * Returns the signature as a hex string.
 */
export function signHmac(canonical: string, secret: string): string {
  return createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

/**
 * Convenience: build canonical + sign in one step.
 */
export function createHmacV1Signature(
  tenantId: string,
  stage: string,
  requestId: string,
  messageOriginal: string,
  config: ConfigJsonV1,
  secret: string,
): string {
  const canonical = buildCanonical(tenantId, stage, requestId, messageOriginal, config);
  return signHmac(canonical, secret);
}
