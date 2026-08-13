import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/** Readiness: 200 только если есть рабочее соединение с БД, иначе 503. */
export async function GET(): Promise<NextResponse> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("Readiness check failed: БД недоступна", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
