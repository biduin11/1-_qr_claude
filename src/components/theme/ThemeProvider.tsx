"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { resolveDefaultTheme } from "@/components/theme/resolve-default-theme";
import { THEME_STORAGE_KEY } from "@/components/theme/theme-script";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

/** Только применяет класс на <html> — без записи в localStorage. Используется
 * при следовании дефолту раздела (переход между /admin и остальным сайтом
 * без явного выбора темы), чтобы не превратить дефолт в зафиксированный
 * выбор. */
function applyThemeClass(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

/** Применяет класс И запоминает как явный выбор пользователя (переключатель). */
function applyAndPersistTheme(theme: Theme): void {
  applyThemeClass(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — тема применяется
    // на текущую сессию, просто не переживёт перезагрузку страницы.
  }
}

/**
 * Класс на <html> уже выставлен синхронно до гидратации (см.
 * src/components/theme/theme-script.ts, подключён в src/app/layout.tsx) —
 * при монтировании только читаем его как стартовое состояние, не решаем
 * тему заново.
 *
 * Раздельные дефолты по разделам (/admin/* — тёмная, остальное — светлая,
 * см. resolveDefaultTheme) технически применяются самим theme-script.ts на
 * каждой полной загрузке страницы. Эффект ниже — подстраховка для
 * клиентской навигации между разделами в рамках одной SPA-сессии (сегодня
 * такой навигации между admin и рабочими экранами в приложении нет — везде
 * либо новая вкладка, либо полная перезагрузка, — но эта проверка не даёт
 * дефолту "залипнуть" не в том разделе, если такая навигация появится
 * позже). Явный выбор пользователя (localStorage) всегда побеждает и здесь
 * не трогается.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const pathname = usePathname();

  useEffect(() => {
    // setState — только внутри колбэка микротаска, не синхронно в теле
    // эффекта (иначе react-hooks/set-state-in-effect, тот же приём, что и в
    // ReferenceDataManager при смене фильтра). Само обновление DOM
    // (applyThemeClass) — не setState, его можно синхронно.
    if (readStoredTheme() !== null) return;
    const routeDefault = resolveDefaultTheme(pathname);
    applyThemeClass(routeDefault);
    queueMicrotask(() => {
      setTheme((prev) => (prev === routeDefault ? prev : routeDefault));
    });
  }, [pathname]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () =>
        setTheme((prev) => {
          const next = prev === "light" ? "dark" : "light";
          applyAndPersistTheme(next);
          return next;
        }),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme должен использоваться внутри ThemeProvider");
  }
  return ctx;
}
