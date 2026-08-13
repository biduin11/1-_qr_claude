import { colorHandlers } from "@/lib/admin/resources/colors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return colorHandlers.setActive(id, false);
}
