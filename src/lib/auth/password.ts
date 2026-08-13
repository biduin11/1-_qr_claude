import { hash, verify } from "@node-rs/argon2";

/**
 * @node-rs/argon2 — Rust-биндинги с готовыми прекомпилированными бинарниками
 * под Windows и Linux, не требует node-gyp/тулчейна сборки. См. ARCHITECTURE.md §8.
 * Дефолты пакета (Argon2id, memoryCost=4096, timeCost=3) не переопределяются —
 * это рекомендованные параметры для нормативного использования.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // verify() бросает исключение на некорректном/повреждённом хеше — трактуем
    // как "не совпало", а не как ошибку сервера (fail closed).
    return false;
  }
}
