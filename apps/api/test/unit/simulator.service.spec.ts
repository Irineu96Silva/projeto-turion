import {
  SimulatorResponseSchema,
  MotorV1ResponseSchema,
} from '@turion/shared';

describe('Simulator contracts', () => {
  describe('SimulatorResponseSchema', () => {
    it('validates a correct response', () => {
      const valid = SimulatorResponseSchema.safeParse({
        reply: 'Olá, como posso ajudar?',
        next_best_action: 'follow_up',
        confidence: 0.85,
      });
      expect(valid.success).toBe(true);
    });

    it('rejects missing fields', () => {
      const invalid = SimulatorResponseSchema.safeParse({
        reply: 'hello',
      });
      expect(invalid.success).toBe(false);
    });

    it('rejects confidence > 1', () => {
      const invalid = SimulatorResponseSchema.safeParse({
        reply: 'hello',
        next_best_action: 'x',
        confidence: 1.5,
      });
      expect(invalid.success).toBe(false);
    });

    it('validates fallback response with confidence 0.10', () => {
      const valid = SimulatorResponseSchema.safeParse({
        reply: 'Fallback message',
        next_best_action: 'retry',
        confidence: 0.1,
      });
      expect(valid.success).toBe(true);
    });
  });

  describe('MotorV1ResponseSchema', () => {
    it('validates a correct motor response', () => {
      const valid = MotorV1ResponseSchema.safeParse({
        reply: 'Motor response',
        next_best_action: 'close_ticket',
        confidence: 0.92,
      });
      expect(valid.success).toBe(true);
    });

    it('rejects motor response missing confidence', () => {
      const invalid = MotorV1ResponseSchema.safeParse({
        reply: 'hello',
        next_best_action: 'follow_up',
      });
      expect(invalid.success).toBe(false);
    });

    it('rejects empty object', () => {
      const invalid = MotorV1ResponseSchema.safeParse({});
      expect(invalid.success).toBe(false);
    });
  });
});
