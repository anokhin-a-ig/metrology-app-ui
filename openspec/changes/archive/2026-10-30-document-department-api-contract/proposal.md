# Proposal

## Why

Контракт REST API каталога департаментов сейчас существует только в коде:
фронтенд вызывает эндпоинты из `src/services/departments.js`, бэкенд реализует их
в `DepartmentController`. Из-за этого агент и разработчик не видят единого
описания ожиданий UI, а расхождения обнаруживаются только в рантайме или тестах.

## What Changes

- Добавляется capability `department-api` — тонкое описание REST-контракта,
  на который опирается интерфейс: эндпоинты, параметры, формы ответов, коды ошибок.
- В `openspec/config.yaml` добавляются `context` и ссылка на store бэкенда.
- Добавляется `docs/architecture.md` с описанием слоёв и интеграции.
- Runtime-код не меняется.

## Capabilities

### New Capabilities

- `department-api`: REST-контракт каталога департаментов в объёме, необходимом UI.

### Modified Capabilities

Нет.

## Impact

- `openspec/config.yaml` — контекст и `references`.
- `docs/architecture.md`, `AGENTS.md` — документация.
- `openspec/specs/department-api/` — новая durable-спека после архивации.
- Бэкенд `D:\IDEA_projects\metrology-app` — источник детального контракта,
  read-only через store `metrology-backend`.
- Изменений в `src/` нет.
