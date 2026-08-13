import { NextResponse } from "next/server";

/** Liveness: 200, если процесс вообще жив. Не проверяет БД — для этого /api/health/ready. */
export function GET(): NextResponse {
  return NextResponse.json({ status: "ok" });
}
