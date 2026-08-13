import { manufacturerHandlers } from "@/lib/admin/resources/manufacturers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return manufacturerHandlers.setActive(id, true);
}
