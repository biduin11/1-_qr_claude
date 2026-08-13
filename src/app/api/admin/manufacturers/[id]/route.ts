import type { NextRequest } from "next/server";

import { manufacturerHandlers } from "@/lib/admin/resources/manufacturers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return manufacturerHandlers.patch(request, id);
}
