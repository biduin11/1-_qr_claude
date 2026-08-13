import { coilHandlers } from "@/lib/admin/coils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return coilHandlers.setActive(id, false);
}
