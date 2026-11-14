# Nocturne Tarot 4.2.1 — патч

Дата: 14.11.2026. Кэш Service Worker: `nocturne-tarot-v4.2.1-r5`.

## Исправлено

- Подсказка «Добавить на экран Домой» больше не показывается, если приложение уже запущено в режиме `standalone` на iOS. Проверка: `display-mode: standalone` или `navigator.standalone`.
- Печать через Ctrl+P / меню браузера теперь раскрывает все `<details>` перед рендером и возвращает их прежнее состояние после печати. Кнопка «Печать / PDF» раскрывает секции сама — это работает и в Safari, где `beforeprint` может не срабатывать.

## Проверки

- `engine-tests.js` — 129/129 (новый тест на `beforeprint` и standalone-подсказку).
- `sw-tests.js` — 6/6.
- `data-safety-tests.js` — 14/14.
- `audit-cards.py` — 78 карт, 0 ошибок, 0 предупреждений.
- Lighthouse на локальной сборке: accessibility 1.0, best practices 1.0, SEO 1.0, провалов нет.

## Обновление

`index.html`, `app.js` и `styles.css` запрашиваются с `?v=4.2.1`, Service Worker — с новым кэшем `-r5`. Старый кэш `-r4` удаляется при активации.
