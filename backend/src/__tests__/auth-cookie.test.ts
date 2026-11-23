import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasRefreshTokenCookieHeader,
  parseCookieHeader,
  parseDurationToMs,
  resolveCookieSameSitePolicy,
} from "../utils/auth-cookie";

describe("auth-cookie utilities", () => {
  it("parses RFC cookie headers including URL-encoded values and `=` padding", () => {
    const cookies = parseCookieHeader(
      "refreshSession=1; refreshToken=eyJhbGciOiJIUzI1NiJ9.payload%3D%3D; theme=dark",
    );
    assert.deepEqual(cookies, {
      refreshSession: "1",
      refreshToken: "eyJhbGciOiJIUzI1NiJ9.payload==",
      theme: "dark",
    });
    assert.equal(
      hasRefreshTokenCookieHeader("refreshSession=1; refreshToken=abc"),
      true,
    );
    assert.equal(hasRefreshTokenCookieHeader("refreshSession=1"), false);
  });

  it("converts supported duration strings to milliseconds and rejects malformed values", () => {
    assert.equal(parseDurationToMs("500ms"), 500);
    assert.equal(parseDurationToMs("30s"), 30_000);
    assert.equal(parseDurationToMs("15m"), 900_000);
    assert.equal(parseDurationToMs("7d"), 7 * 24 * 60 * 60 * 1000);
    assert.equal(parseDurationToMs("0d"), undefined);
    assert.equal(parseDurationToMs("-5m"), undefined);
    assert.equal(parseDurationToMs("invalid"), undefined);
  });

  it("defaults to SameSite=Lax in development and same-origin production, using None only for cross-origin HTTPS", () => {
    assert.equal(
      resolveCookieSameSitePolicy({
        isProd: false,
        corsOrigin: "https://app.example.com",
        rawCorsOriginEnv: "https://app.example.com",
      }),
      "lax",
    );

    // Render Blueprint default: CORS_ORIGIN env omitted, single-origin deployment
    assert.equal(
      resolveCookieSameSitePolicy({
        isProd: true,
        corsOrigin: "https://flexilearn.onrender.com",
        rawCorsOriginEnv: "",
        renderExternalUrl: "https://flexilearn.onrender.com",
      }),
      "lax",
    );

    // Explicit same-origin CORS_ORIGIN matching RENDER_EXTERNAL_URL stays Lax
    assert.equal(
      resolveCookieSameSitePolicy({
        isProd: true,
        corsOrigin: "https://flexilearn.onrender.com",
        rawCorsOriginEnv: "https://flexilearn.onrender.com",
        renderExternalUrl: "https://flexilearn.onrender.com",
      }),
      "lax",
    );

    // Split-origin HTTPS frontend requires SameSite=None
    assert.equal(
      resolveCookieSameSitePolicy({
        isProd: true,
        corsOrigin: ["https://learn.example.com"],
        rawCorsOriginEnv: "https://learn.example.com",
        renderExternalUrl: "https://api.example.com",
      }),
      "none",
    );
  });
});
