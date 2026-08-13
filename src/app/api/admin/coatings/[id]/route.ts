import type { NextRequest } from "next/server";

import { coatingHandlers } from "@/lib/admin/resources/coatings";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return coatingHandlers.patch(request, id);
}
