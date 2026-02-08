import { redactMessage } from '@turion/shared';

describe('redactMessage', () => {
  it('masks email addresses', () => {
    const result = redactMessage('Meu email é joao@example.com');
    expect(result).toContain('***@example.com');
    expect(result).not.toContain('joao@');
  });

  it('masks phone numbers (Brazilian format)', () => {
    const result = redactMessage('Ligue para 11 99999-1234');
    expect(result).toContain('***-1234');
    expect(result).not.toContain('99999');
  });

  it('masks phone with country code', () => {
    const result = redactMessage('Whatsapp: +55 11 98765-4321');
    expect(result).toContain('***-4321');
  });

  it('truncates messages longer than 100 characters', () => {
    const longMessage = 'a'.repeat(150);
    const result = redactMessage(longMessage);
    expect(result.length).toBeLessThanOrEqual(103); // 100 + "..."
    expect(result).toContain('...');
  });

  it('leaves short messages without PII unchanged', () => {
    const msg = 'Oi, preciso de ajuda';
    expect(redactMessage(msg)).toBe(msg);
  });

  it('handles multiple emails and phones', () => {
    const result = redactMessage('email: a@b.com e tel: 11 9999-8888');
    expect(result).toContain('***@b.com');
    expect(result).toContain('***-8888');
  });
});
