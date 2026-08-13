import { coatingHandlers } from "@/lib/admin/resources/coatings";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return coatingHandlers.setActive(id, true);
}
