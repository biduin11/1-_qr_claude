/**
 * Форма ActiveMaterialRequirement — ARCHITECTURE.md §6. Хранится только в
 * браузере (IndexedDB через idb-keyval), никогда на сервере. Канонические
 * коды (не id справочников) — сравнение при сканировании рулона (Iteration 6)
 * идёт по кодам, которые приходят в ответе `/api/coil/:id`, а не по
 * внутренним id этой БД.
 */
export const ACTIVE_REQUIREMENT_STORAGE_KEY = "activeMaterialRequirement";

export type ActiveMaterialRequirement = {
  ral: string;
  ralDisplayName: string;
  thicknessHundredths: number;
  thicknessDisplayName: string;
  manufacturer: string;
  manufacturerDisplayName: string;
  coating: string;
  coatingDisplayName: string;
  createdAt: string;
  /** Задел на будущий TTL (не обязателен для V1) — раздел 6 ТЗ. */
  expiresAt: string | null;
};
