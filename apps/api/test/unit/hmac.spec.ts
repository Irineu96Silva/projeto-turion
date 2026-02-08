import { createHash } from 'node:crypto';
import {
  buildCanonical,
  signHmac,
  createHmacV1Signature,
  stableStringify,
  type ConfigJsonV1,
} from '@turion/shared';
import vectors from '../fixtures/hmac-vectors.json';

describe('HMAC v1', () => {
  describe('buildCanonical', () => {
    it('produces expected canonical format', () => {
      const v = vectors[0];
      const canonical = buildCanonical(
        v.tenantId,
        v.stage,
        v.requestId,
        v.messageOriginal,
        v.configJson as ConfigJsonV1,
      );

      const msgHash = createHash('sha256').update(v.messageOriginal, 'utf8').digest('hex');
      const configHash = createHash('sha256')
        .update(stableStringify(v.configJson), 'utf8')
        .digest('hex');

      const expected = `${v.tenantId}|${v.stage}|${v.requestId}|${msgHash}|${configHash}`;
      expect(canonical).toBe(expected);
    });

    it('produces same config hash regardless of key order', () => {
      const v0 = vectors[0];
      const v1 = vectors[1];

      // Build canonicals with the same config but different key orders
      // Vector 1 has keys in different order
      const config1 = {
        tone: 'formal' as const,
        cta_style: 'soft' as const,
        template_fallback: 'test',
        guardrails: { on: true, max_tokens: 256, blocked_topics: [] as string[] },
        questions: [] as string[],
      };

      const config2 = {
        questions: [] as string[],
        guardrails: { blocked_topics: [] as string[], max_tokens: 256, on: true },
        template_fallback: 'test',
        cta_style: 'soft' as const,
        tone: 'formal' as const,
      };

      const canonical1 = buildCanonical(v0.tenantId, v0.stage, v0.requestId, v0.messageOriginal, config1);
      const canonical2 = buildCanonical(v0.tenantId, v0.stage, v0.requestId, v0.messageOriginal, config2);

      expect(canonical1).toBe(canonical2);
    });
  });

  describe('signHmac', () => {
    it('produces deterministic signatures', () => {
      const canonical = 'test|canonical|string';
      const secret = 'test-secret';

      const sig1 = signHmac(canonical, secret);
      const sig2 = signHmac(canonical, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[0-9a-f]{64}$/); // SHA256 hex
    });

    it('different secrets produce different signatures', () => {
      const canonical = 'test|canonical|string';
      const sig1 = signHmac(canonical, 'secret-a');
      const sig2 = signHmac(canonical, 'secret-b');
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('createHmacV1Signature (convenience)', () => {
    it('produces consistent signature for same inputs', () => {
      const v = vectors[0];
      const sig1 = createHmacV1Signature(
        v.tenantId,
        v.stage,
        v.requestId,
        v.messageOriginal,
        v.configJson as ConfigJsonV1,
        v.secret,
      );
      const sig2 = createHmacV1Signature(
        v.tenantId,
        v.stage,
        v.requestId,
        v.messageOriginal,
        v.configJson as ConfigJsonV1,
        v.secret,
      );
      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
