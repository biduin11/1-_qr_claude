import { thicknessHandlers } from "@/lib/admin/resources/thicknesses";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return thicknessHandlers.setActive(id, true);
}
