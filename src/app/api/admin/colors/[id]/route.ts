import type { NextRequest } from "next/server";

import { colorHandlers } from "@/lib/admin/resources/colors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return colorHandlers.patch(request, id);
}
