import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validEnv = {
  APP_ENV: "development",
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  SESSION_COOKIE_SECRET: "a".repeat(32),
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

describe("getConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("возвращает распарсенный конфиг при корректных переменных", async () => {
    Object.assign(process.env, validEnv);
    const { getConfig } = await import("@/lib/config");
    const config = getConfig();
    expect(config.APP_ENV).toBe("development");
    expect(config.DATABASE_URL).toBe(validEnv.DATABASE_URL);
  });

  it("бросает ошибку, если APP_ENV не development и не production", async () => {
    Object.assign(process.env, validEnv, { APP_ENV: "staging" });
    const { getConfig } = await import("@/lib/config");
    expect(() => getConfig()).toThrow(/APP_ENV/);
  });

  it("бросает ошибку, если DATABASE_URL отсутствует", async () => {
    Object.assign(process.env, validEnv);
    delete process.env.DATABASE_URL;
    const { getConfig } = await import("@/lib/config");
    expect(() => getConfig()).toThrow(/DATABASE_URL/);
  });

  it("бросает ошибку, если SESSION_COOKIE_SECRET короче 32 символов", async () => {
    Object.assign(process.env, validEnv, { SESSION_COOKIE_SECRET: "short" });
    const { getConfig } = await import("@/lib/config");
    expect(() => getConfig()).toThrow(/SESSION_COOKIE_SECRET/);
  });

  it("кэширует результат между вызовами", async () => {
    Object.assign(process.env, validEnv);
    const { getConfig } = await import("@/lib/config");
    const first = getConfig();
    process.env.DATABASE_URL = "postgresql://changed";
    const second = getConfig();
    expect(second).toBe(first);
  });
});
