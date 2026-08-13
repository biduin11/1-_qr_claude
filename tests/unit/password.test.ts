import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword / verifyPassword", () => {
  it("верный пароль проходит проверку против своего хеша", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword(hash, "correct-horse-battery-staple")).resolves.toBe(true);
  });

  it("неверный пароль не проходит проверку", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });

  it("два хеша одного пароля различаются (случайная соль)", async () => {
    const first = await hashPassword("same-password");
    const second = await hashPassword("same-password");
    expect(first).not.toBe(second);
  });

  it("повреждённый/произвольный хеш трактуется как несовпадение, а не бросает исключение", async () => {
    await expect(verifyPassword("not-a-real-argon2-hash", "anything")).resolves.toBe(false);
  });
});
