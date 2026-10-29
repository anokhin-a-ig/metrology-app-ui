# Tasks

## 1. Связь с бэкендом

- [x] 1.1 Зарегистрировать `D:\IDEA_projects\metrology-app` как store `metrology-backend`; проверка: `openspec store doctor metrology-backend` без ошибок.
- [x] 1.2 Добавить `references: [metrology-backend]` в `openspec/config.yaml`; проверка: `openspec context --json` содержит store.
- [x] 1.3 Заполнить `context` в `openspec/config.yaml`; проверка: `openspec context --json` возвращает текст без ошибок парсинга.

## 2. Архитектурная документация

- [x] 2.1 Создать `docs/architecture.md` по черновику; проверка: все разделы и таблица эндпоинтов на месте.
- [x] 2.2 Обновить `AGENTS.md`: ссылка на архитектуру, store, актуальное состояние каталогов; проверка: факты совпадают с `src/`.

## 3. Спека API

- [x] 3.1 Создать change `document-department-api-contract` и заполнить `proposal.md`; проверка: `openspec status --change document-department-api-contract --json`.
- [x] 3.2 Написать `specs/department-api/spec.md`; проверка: `openspec validate document-department-api-contract --strict`.
- [x] 3.3 Сверить каждый эндпоинт и код ответа с `DepartmentController` и `src/services/departments.js`; проверка: расхождений нет, `deletion-check` помечен как зависимость от `add-department-deletion`.
- [x] 3.4 Написать `design.md` по черновику; проверка: решения и риски не противоречат спеке.

## 4. Проверка и архивация

- [x] 4.1 Прогнать `openspec validate document-department-api-contract --strict`; проверка: команда завершается успешно.
- [x] 4.2 Убедиться, что `npm test -- --watchAll=false`, `npx eslint src`, `npm run build` не затронуты; проверка: команды проходят.
- [x] 4.3 Архивировать change после ревью; проверка: `openspec/specs/department-api/spec.md` существует, `openspec list` не показывает change.

## Workflow follow-up

- Завести capability `department-api` в OpenSpec бэкенда `metrology-app`.
- При следующем изменении API обновлять обе спеки и `Impact` в proposal.
