import type { NextRequest } from "next/server";

import { thicknessHandlers } from "@/lib/admin/resources/thicknesses";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return thicknessHandlers.patch(request, id);
}
