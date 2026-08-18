/**
 * Инлайн-скрипт применения темы — строка, а не JSX, потому что должен
 * попасть в <head> и выполниться синхронно до первой отрисовки (иначе
 * вспышка не той темы при загрузке). Источник истины — localStorage;
 * без сохранённого выбора по умолчанию тёмная тема (совпадает с уже
 * привычным видом приложения, раздел ТЗ не требует системную по
 * умолчанию — допустимы оба варианта).
 */
export const THEME_STORAGE_KEY = "theme";

export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t='dark';}var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t;}catch(e){}})();`;
