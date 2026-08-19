/**
 * Инлайн-скрипт применения темы — строка, а не JSX, потому что должен
 * попасть в <head> и выполниться синхронно до первой отрисовки (иначе
 * вспышка не той темы при загрузке). Источник истины — localStorage; без
 * сохранённого выбора дефолт зависит от раздела: /admin/* — тёмная,
 * остальное — светлая (см. resolveDefaultTheme в resolve-default-theme.ts —
 * та же логика, продублированная тут строкой, т.к. инлайн-скрипт не может
 * импортировать модуль; менять оба места синхронно).
 */
export const THEME_STORAGE_KEY = "theme";

export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=/^\\/admin(\\/|$)/.test(location.pathname)?'dark':'light';}var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t;}catch(e){}})();`;
