import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

/** Единый формат ошибок API — см. API_CONTRACT.md. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  logger.error("Необработанная ошибка в API-обработчике", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Внутренняя ошибка сервера" } },
    { status: 500 },
  );
}
