/**
 * Создаёт или обновляет пароль AdminUser. Единственный официальный способ
 * завести администратора в prod (там prisma/seed.ts НЕ создаёт учётки —
 * см. seedDevAdmin() в seed.ts). Годится и для dev.
 *
 * Использование:
 *   npm run admin:create -- --username=admin --password="хотя бы 12 символов"
 */
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((entry) => entry.startsWith(prefix));
  return arg?.slice(prefix.length);
}

async function main(): Promise<void> {
  const username = readArg("username");
  const password = readArg("password");

  if (!username || !password) {
    console.error(
      'Использование: npm run admin:create -- --username=<логин> --password="<пароль>"',
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < 12) {
    console.error("Пароль должен быть не короче 12 символов");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await hash(password);
    const user = await prisma.adminUser.upsert({
      where: { username },
      update: { passwordHash, active: true },
      create: { username, passwordHash },
    });
    console.log(`[admin] Пользователь "${user.username}" готов (id=${user.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
