const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,3}[\s.-]?)?\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g;
const MAX_LENGTH = 100;

/**
 * Masks emails and phone numbers, then truncates to MAX_LENGTH characters.
 */
export function redactMessage(message: string): string {
  let redacted = message.replace(EMAIL_REGEX, (match) => {
    const atIndex = match.indexOf('@');
    if (atIndex === -1) return match;
    return '***' + match.slice(atIndex);
  });

  redacted = redacted.replace(PHONE_REGEX, (match) => {
    const lastFour = match.replace(/\D/g, '').slice(-4);
    return '***-' + lastFour;
  });

  if (redacted.length > MAX_LENGTH) {
    redacted = redacted.slice(0, MAX_LENGTH) + '...';
  }

  return redacted;
}
