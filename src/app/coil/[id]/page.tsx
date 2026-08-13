import { CoilVerdict } from "@/components/worker/CoilVerdict";
import { FullScreenMessage } from "@/components/worker/FullScreenMessage";
import { getPublicCoil } from "@/lib/public/coil";

// Данные рулона всегда live (см. src/app/api/coil/[id]/route.ts и ARCHITECTURE.md §9).
export const dynamic = "force-dynamic";

export default async function PublicCoilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coil = await getPublicCoil(id);

  // Терминальные состояния безопасно решать по SSR-данным: даже если к моменту
  // гидратации это успело устареть, худший случай — тот же вердикт СТОП,
  // который дал бы и клиентский повторный запрос (ARCHITECTURE.md §2).
  if (!coil) {
    return <FullScreenMessage icon="✕" title="РУЛОН НЕ НАЙДЕН" />;
  }
  if (!coil.active) {
    return <FullScreenMessage icon="✕" title="РУЛОН НЕДОСТУПЕН" />;
  }

  return <CoilVerdict id={id} initialCoil={coil} />;
}
