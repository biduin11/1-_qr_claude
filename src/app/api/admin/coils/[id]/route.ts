import type { NextRequest } from "next/server";

import { coilHandlers } from "@/lib/admin/coils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return coilHandlers.patch(request, id);
}
