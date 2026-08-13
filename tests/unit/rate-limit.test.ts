import { beforeEach, describe, expect, it } from "vitest";

import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/auth/rate-limit";

describe("checkLoginRateLimit", () => {
  beforeEach(() => {
    resetLoginRateLimit();
  });

  it("разрешает попытки до лимита (5) и блокирует шестую", () => {
    const key = "1.2.3.4:admin";
    for (let i = 0; i < 5; i += 1) {
      expect(checkLoginRateLimit(key)).toBe(true);
    }
    expect(checkLoginRateLimit(key)).toBe(false);
  });

  it("разные ключи (IP+логин) не влияют друг на друга", () => {
    for (let i = 0; i < 5; i += 1) {
      checkLoginRateLimit("1.2.3.4:admin");
    }
    expect(checkLoginRateLimit("1.2.3.4:admin")).toBe(false);
    expect(checkLoginRateLimit("5.6.7.8:admin")).toBe(true);
    expect(checkLoginRateLimit("1.2.3.4:другой-логин")).toBe(true);
  });

  it("resetLoginRateLimit сбрасывает счётчики", () => {
    const key = "1.2.3.4:admin";
    for (let i = 0; i < 5; i += 1) {
      checkLoginRateLimit(key);
    }
    expect(checkLoginRateLimit(key)).toBe(false);
    resetLoginRateLimit();
    expect(checkLoginRateLimit(key)).toBe(true);
  });
});
