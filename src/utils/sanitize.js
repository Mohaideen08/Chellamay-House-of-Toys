/**
 * Escapes HTML special characters to prevent HTML/JS injection.
 * Use this on ALL user-supplied strings before inserting into document.write() HTML.
 */
export const esc = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Validates an email address format.
 */
export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? '').trim());

/**
 * Strips all HTML tags from a string (for plain-text fields).
 */
export const stripTags = (str) =>
  String(str ?? '').replace(/<[^>]*>/g, '');

/**
 * Truncates a string to a max length to prevent oversized payloads.
 */
export const truncate = (str, max = 200) =>
  String(str ?? '').slice(0, max);
