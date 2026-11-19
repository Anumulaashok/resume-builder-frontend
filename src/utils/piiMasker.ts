export const MAX_PROMPT_LENGTH = 2000;

export interface PersonalIdentifiers {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

const PLACEHOLDER_NAMES = new Set([
  'your name',
  'untitled resume',
  'ai draft',
  'candidate',
  'john doe',
  'jane doe',
]);

const PLACEHOLDER_EMAILS = new Set([
  'you@example.com',
  'jane@example.com',
  'john@example.com',
]);

const escapeRegExp = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const PHONE_PATTERN = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g;
const STREET_ADDRESS_PATTERN =
  /\b\d{1,6}\s+[A-Z][a-zA-Z0-9\s]{1,35}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Parkway|Pkwy)\.?(?:\s*,?\s*(?:Apt|Suite|Unit|#)\s*[A-Za-z0-9-]+)?\b/g;
const CARD_OR_ID_PATTERN = /\b(?:\d[ -]*?){13,16}\b/g;

/**
 * Masks sensitive personal identifiers (emails, phone numbers, SSNs, street addresses,
 * payment/ID numbers, and known user personal fields) before sending text to third-party LLMs.
 */
export const maskPII = (
  text: string,
  identifiers?: PersonalIdentifiers
): string => {
  if (!text) return '';

  let masked = text;

  if (identifiers?.email) {
    const rawEmail = identifiers.email.trim();
    if (rawEmail && !PLACEHOLDER_EMAILS.has(rawEmail.toLowerCase())) {
      masked = masked.replace(new RegExp(escapeRegExp(rawEmail), 'gi'), '[EMAIL]');
    }
  }

  if (identifiers?.phone) {
    const rawPhone = identifiers.phone.trim();
    if (rawPhone.length >= 7) {
      masked = masked.replace(new RegExp(escapeRegExp(rawPhone), 'gi'), '[PHONE]');
    }
  }

  if (identifiers?.address) {
    const rawAddress = identifiers.address.trim();
    if (rawAddress.length >= 5) {
      masked = masked.replace(new RegExp(escapeRegExp(rawAddress), 'gi'), '[ADDRESS]');
    }
  }

  if (identifiers?.name) {
    const rawName = identifiers.name.trim();
    if (rawName.length >= 3 && !PLACEHOLDER_NAMES.has(rawName.toLowerCase())) {
      masked = masked.replace(
        new RegExp(`\\b${escapeRegExp(rawName)}\\b`, 'gi'),
        '[NAME]'
      );
    }
  }

  masked = masked
    .replace(EMAIL_PATTERN, '[EMAIL]')
    .replace(SSN_PATTERN, '[SSN]')
    .replace(CARD_OR_ID_PATTERN, '[REDACTED_ID]')
    .replace(PHONE_PATTERN, '[PHONE]')
    .replace(STREET_ADDRESS_PATTERN, '[ADDRESS]');

  return masked;
};

/**
 * Enforces the 2000-character limit on AI prompts on the client.
 */
export const validatePromptLength = (text: string, label = 'Prompt'): void => {
  if (text.length > MAX_PROMPT_LENGTH) {
    throw new Error(`${label} cannot exceed ${MAX_PROMPT_LENGTH} characters`);
  }
};
