import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeCanonicalEmail,
  sanitizeUserPlainText,
} from "../utils/sanitize-user-content";

describe("sanitizeUserPlainText", () => {
  it("strips executable script/style blocks, HTML comments, and unsafe tags", () => {
    const raw =
      'Hello <!-- hidden --><script>alert("xss")</script><style>body{display:none}</style><b>World</b><img src=x onerror=alert(1) />';
    assert.equal(sanitizeUserPlainText(raw), "Hello World");
  });

  it("handles nested/split tag bypass attempts and remains strictly idempotent", () => {
    const nested = "<<script>script>evil()<</script>/script>Clean text";
    const once = sanitizeUserPlainText(nested);
    const twice = sanitizeUserPlainText(once);
    assert.equal(once, "Clean text");
    assert.equal(twice, once);
  });

  it("preserves literal ampersands, generics, and comparison operators in plain text", () => {
    const technicalContent =
      "Learn C++ & TypeScript Array<T> where a < b && c > d (100% practical)";
    assert.equal(
      sanitizeUserPlainText(technicalContent),
      "Learn C++ & TypeScript Array<T> where a < b && c > d (100% practical)",
    );
    assert.equal(
      sanitizeUserPlainText(sanitizeUserPlainText(technicalContent)),
      technicalContent,
    );
  });

  it("normalizes CRLF line endings and strips ASCII control characters", () => {
    const input = "Line 1\r\nLine 2\u0000\u0007\rLine 3";
    assert.equal(sanitizeUserPlainText(input), "Line 1\nLine 2\nLine 3");
  });
});

describe("normalizeCanonicalEmail", () => {
  it("trims whitespace and lowercases without stripping Gmail dots or plus subaddresses", () => {
    assert.equal(
      normalizeCanonicalEmail("  Jane.Doe+teacher@Gmail.COM  "),
      "jane.doe+teacher@gmail.com",
    );
  });
});
