const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_COMMENTS = /<!--[\s\S]*?-->/g;
const DANGEROUS_ELEMENT_BLOCKS =
  /<(script|style|iframe|object|embed|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const KNOWN_HTML_TAGS =
  /<\/?(?:script|style|iframe|object|embed|svg|math|img|video|audio|source|track|link|meta|base|form|input|button|textarea|select|option|a|p|div|span|br|hr|h[1-6]|ul|ol|li|dl|dt|dd|table|thead|tbody|tfoot|tr|th|td|blockquote|pre|code|em|strong|b|i|u|s|sub|sup|mark|small|del|ins|details|summary|dialog|template|slot|canvas|noscript|section|article|aside|header|footer|nav|main|figure|figcaption)\b[^>]*>/gi;
const ATTRIBUTED_OR_SELF_CLOSING_TAGS =
  /<\/?[a-zA-Z][a-zA-Z0-9:-]*(?:\s+[^<>]*|\/)\s*>/g;

/**
 * Strips executable/HTML markup and control characters from plain-text user input
 * without HTML-encoding literal characters (`&`, `<`, `>`), keeping stored text
 * idempotent and safe for plain-text rendering.
 */
export const sanitizeUserPlainText = (value: string): string => {
  let current = value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARACTERS, "");

  let previous = "";
  while (current !== previous) {
    previous = current;
    current = current
      .replace(HTML_COMMENTS, "")
      .replace(DANGEROUS_ELEMENT_BLOCKS, "")
      .replace(KNOWN_HTML_TAGS, "")
      .replace(ATTRIBUTED_OR_SELF_CLOSING_TAGS, "");
  }

  return current.trim();
};

/**
 * Canonicalizes email addresses without provider-specific dot/subaddress stripping
 * so registration, login, password reset, and admin user creation resolve identically.
 */
export const normalizeCanonicalEmail = (value: string): string =>
  value.trim().toLowerCase();
