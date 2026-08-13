import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { destroySession } from "@/lib/auth/session";

export async function POST(): Promise<NextResponse> {
  try {
    await destroySession();
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
