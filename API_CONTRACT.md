# API_CONTRACT.md — «Контроль металла»

Все ответы — JSON, кроме где указано иное. Ошибки — единый формат:

```json
{ "error": { "code": "COIL_NOT_FOUND", "message": "Рулон не найден" } }
```

Аутентификация admin-эндпоинтов — httpOnly cookie-сессия (`POST /api/admin/login`). Публичные страницы `/`, `/check`, `/coil/:id` рендерятся серверными компонентами напрямую через Prisma и не описаны здесь как API — здесь только JSON-эндпоинты.

## Публичное

### `GET /api/coil/:id`

Используется клиентским кодом сканера сразу после декодирования QR рулона (страница `/coil/:id` дополнительно резолвит то же самое при SSR).

Ответ 200:
```json
{
  "id": "clx...",
  "active": true,
  "ral": { "code": "7024", "displayName": "RAL 7024" },
  "thickness": { "valueHundredths": 50, "displayName": "0,50 мм" },
  "manufacturer": { "code": "UZBEKISTAN", "displayName": "Узбекистан" },
  "coating": { "code": "VIKING", "displayName": "Viking" }
}
```

- 404 `COIL_NOT_FOUND` — id не существует.
- 410 `COIL_INACTIVE` — рулон деактивирован (`active = false`); тело всё равно возвращает `active: false`, но клиент обязан трактовать это как СТОП, не как обычный рулон.
- Никаких служебных полей (`createdAt`/`updatedAt`) не отдаётся — не нужны клиенту, минимизация поверхности.
- Всегда `network-only`, не кэшируется service worker'ом (см. ARCHITECTURE.md §9).

## Admin — аутентификация

### `POST /api/admin/login`

Тело: `{ "username": string, "password": string }`.

- 200 — сессия создана, `Set-Cookie` с httpOnly/Secure/SameSite=Lax токеном.
- 401 `INVALID_CREDENTIALS` — неверный логин/пароль (единое сообщение, не уточнять что именно неверно).
- 429 `RATE_LIMITED` — превышен лимит попыток.

### `POST /api/admin/logout`

Инвалидирует текущую `AdminSession` в БД, очищает cookie. 200 в любом случае (идемпотентно).

## Admin — справочники

Одинаковый шаблон для `colors`, `thicknesses`, `manufacturers`, `coatings` (кроме различий полей):

- `GET /api/admin/{resource}` — список, query `?active=true|false|all` (по умолчанию `all` в admin-списке).
- `POST /api/admin/{resource}` — создание. Валидация полей zod-схемой конкретного справочника.
- `PATCH /api/admin/{resource}/:id` — редактирование полей (кроме `id`).
- `POST /api/admin/{resource}/:id/deactivate` — `active = false`.
- `POST /api/admin/{resource}/:id/restore` — `active = true`.

Для `manufacturers`/`coatings` дополнительно поле `aliases: string[]` в теле создания/редактирования.

Ошибки: 409 `CODE_ALREADY_EXISTS` при дубликате `code`/`valueHundredths`, 400 `VALIDATION_ERROR` с деталями по полям.

## Admin — рулоны

- `GET /api/admin/coils` — список с фильтрами: `?colorId=&thicknessId=&manufacturerId=&coatingId=&active=true|false&search=`. Фильтры по справочникам — через `id` конкретной записи (не через код/значение как в `/check` — административный UI сам подставляет `id` из выбранного пункта выпадающего списка, парсинг кода/значения на сервере не нужен). `active` без параметра — все записи. `search` — регистронезависимый поиск по коду/названию связанных справочников (RAL, толщина, производитель, покрытие). Ответ: `{ "items": [ { "id", "active", "createdAt", "updatedAt", "color": {...}, "thickness": {...}, "manufacturer": {...}, "coating": {...} } ] }` — с полными данными связанных справочников (не только id), чтобы admin-список не делал по 4 дополнительных запроса на страницу.
- `POST /api/admin/coils` — тело: `{ colorId, thicknessId, manufacturerId, coatingId }` — только ссылки на существующие записи справочников, без свободного текста (раздел 23 ТЗ). Сервер дополнительно проверяет, что все 4 ссылки существуют и активны — не только на уровне UI (fail closed), иначе 400 `VALIDATION_ERROR`.
- `PATCH /api/admin/coils/:id` — частичное изменение ссылок на справочники, та же проверка активности на изменённые (и оставшиеся прежними) ссылки.
- `POST /api/admin/coils/:id/deactivate`, `POST /api/admin/coils/:id/restore`.
- `GET /api/admin/coils/:id/qr` — **не реализовано** (запланировано на Iteration 8, раздел 26 ТЗ) — данные для печати: `{ url: string, coil: {...} }`; сам QR-образ генерируется клиентом либо отдаётся как `image/png` при `?format=png`.

Без уникального constraint на комбинацию 4 характеристик — несколько рулонов с одинаковыми `colorId`/`thicknessId`/`manufacturerId`/`coatingId` допустимы и создают отдельные записи с разными `id` (раздел 24 ТЗ).

## Admin — Excel-импорт

### `POST /api/admin/import/parse`

`multipart/form-data`, поле `file` — `.xlsx`.

Ответ 200:
```json
{
  "totalRows": 120,
  "validRows": 115,
  "invalidRows": 5,
  "rows": [
    { "rowNumber": 2, "status": "valid", "colorId": "...", "thicknessId": "...", "manufacturerId": "...", "coatingId": "..." },
    { "rowNumber": 7, "status": "invalid", "errors": ["Неизвестное покрытие: rooftop_barhat"] }
  ]
}
```

- 413 `TOO_MANY_ROWS` — превышен лимит строк (см. EXCEL_IMPORT.md).
- 400 `INVALID_FILE_FORMAT` — не `.xlsx` или не читается.

### `POST /api/admin/import/confirm`

Тело: `{ idempotencyKey: string, rows: [ { colorId, thicknessId, manufacturerId, coatingId } ] }` — валидные строки из превью, отправленные обратно клиентом. Сервер ничего не хранил с момента `parse` — это единственный источник данных об импорте на этом запросе.

**Сервер не доверяет этому payload'у слепо** — каждая строка перепроверяется заново (существование и активность `colorId`/`thicknessId`/`manufacturerId`/`coatingId` на момент этого запроса, не на момент `parse`). Строки, не прошедшие повторную проверку (например, справочная запись была деактивирована между `parse` и `confirm`), исключаются из создания и попадают в `skipped`, не откатывая остальной импорт. Подробная схема и обоснование — ARCHITECTURE.md §7, EXCEL_IMPORT.md.

Ответ 200: `{ "imported": 115, "skipped": 5, "skippedRows": [ { "row": {...}, "reason": "Справочная запись деактивирована" } ] }`.

Повторный вызов с тем же `idempotencyKey` — 200 с тем же результатом, без повторного создания записей (защита от двойной отправки одного и того же запроса; не путать с повторной валидацией выше — это два разных механизма).

### `GET /api/admin/export/excel-template`

Возвращает `.xlsx` (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) с листами `Import` и `Reference`, сгенерированный из текущего состояния справочников.

## Health

- `GET /api/health` — 200 всегда, если процесс жив (liveness).
- `GET /api/health/ready` — 200 если есть соединение с БД, иначе 503 (readiness).

## Коды ошибок (сводно)

`VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `RATE_LIMITED`, `UNAUTHORIZED`, `FORBIDDEN`, `COIL_NOT_FOUND`, `COIL_INACTIVE`, `CODE_ALREADY_EXISTS`, `TOO_MANY_ROWS`, `INVALID_FILE_FORMAT`, `NOT_FOUND`.
