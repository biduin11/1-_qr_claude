"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type NounForms = [one: string, few: string, many: string];

/** Склонение "запись/записи/записей" по числу (1, 21… / 2-4, 22-24… / остальное). */
function pluralizeRu(n: number, [one, few, many]: NounForms): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Список страниц с многоточиями: все страницы, если их немного, иначе края + окно вокруг текущей. */
function buildPageList(current: number, count: number): Array<number | "…"> {
  if (count <= 7) {
    return Array.from({ length: count }, (_, i) => i + 1);
  }
  const keep = new Set<number>([1, 2, count - 1, count, current - 1, current, current + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const result: Array<number | "…"> = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  nounForms = ["запись", "записи", "записей"],
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  nounForms?: NounForms;
}) {
  if (total === 0) return null;

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="admin-pagination">
      <span className="admin-pagination-info">
        Показано {from}–{to} из {total} {pluralizeRu(total, nounForms)}
      </span>
      <div className="admin-pagination-controls">
        <button
          type="button"
          className="admin-page-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Предыдущая страница"
        >
          <ChevronLeft size={16} />
        </button>
        {buildPageList(page, pageCount).map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="admin-pagination-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`admin-page-btn${p === page ? " is-current" : ""}`}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="admin-page-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Следующая страница"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
