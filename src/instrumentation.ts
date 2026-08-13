export async function register(): Promise<void> {
  // Guard требует Prisma/Node API — не выполняется в edge-рантайме.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnvironmentGuard } = await import("@/lib/env-guard");
    await assertEnvironmentGuard();
  }
}
