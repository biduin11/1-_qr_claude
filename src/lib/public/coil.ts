import { prisma } from "@/lib/prisma";

/**
 * Безопасная публичная форма рулона — без служебных полей (createdAt/updatedAt,
 * внутренние id справочников). Используется и API-роутом /api/coil/:id
 * (клиентский fetch после скана QR — Iteration 6), и SSR-страницей /coil/:id
 * для read-only карточки (ARCHITECTURE.md §2). Единая форма, не дублируется.
 */
export type PublicCoil = {
  id: string;
  active: boolean;
  ral: { code: string; displayName: string };
  thickness: { valueHundredths: number; displayName: string };
  manufacturer: { code: string; displayName: string };
  coating: { code: string; displayName: string };
};

export async function getPublicCoil(id: string): Promise<PublicCoil | null> {
  const coil = await prisma.coil.findUnique({
    where: { id },
    include: { color: true, thickness: true, manufacturer: true, coating: true },
  });

  if (!coil) {
    return null;
  }

  return {
    id: coil.id,
    active: coil.active,
    ral: { code: coil.color.code, displayName: coil.color.displayName },
    thickness: {
      valueHundredths: coil.thickness.valueHundredths,
      displayName: coil.thickness.displayName,
    },
    manufacturer: { code: coil.manufacturer.code, displayName: coil.manufacturer.displayName },
    coating: { code: coil.coating.code, displayName: coil.coating.displayName },
  };
}
