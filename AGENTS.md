# AGENTS.md

## Состояние проекта
- Create React App + React 19, JavaScript (без TypeScript). `App` рендерит `Layout` с каталогом департаментов.
- `src/logo.svg` и `src/reportWebVitals.js` удалены — не импортировать их (импорты из CRA-заглушки уже убраны, `npm start`/`npm run build` проходят).
- `README.md` — стандартный CRA-шаблон, не описывает проект. Актуальные требования: `openspec/specs/` (durable-спеки) и `openspec/changes/` (изменения в работе).
- `openspec/specs/` пока пуст: durable-спека `department-catalog` появится после архивации `add-department-deletion`.

## Команды
- `npm install`
- `npm start` — dev-сервер на http://localhost:3000
- `npm test -- --watchAll=false` — все тесты; один файл: `npm test -- --watchAll=false src/__tests__/Foo.test.js`
- `npm run build` — production-сборка, также показывает ошибки ESLint
- Отдельных `lint`/`typecheck` нет. ESLint 8 (`react-app` preset): `npx eslint src`
- OpenSpec CLI 1.14.1 установлен глобально: `openspec list --json`, `openspec status --change <name> --json`

## Архитектура
- Точка входа: `src/index.js` → `src/App.js`.
- Реализованы: `src/components/Departments`, `src/components/Layout`, `src/services`.
- Только React + CSS (`src/App.css`, `src/index.css`); нет роутера, стейт-менеджера и UI-библиотеки.
- Архитектура и интеграция с бэкендом: `docs/architecture.md`.
- Контракт API, на который опирается UI, — capability `department-api` (появится в `openspec/specs/` после архивации соответствующего change).
- Бэкенд `D:\IDEA_projects\metrology-app` подключён как store `metrology-backend`; детальные спеки API ведутся там. Регистрация: `openspec store register <path> --id metrology-backend`.

## Конвенции
- Спецификации, задачи и текст UI — на русском.
- Фичи вести через OpenSpec (schema `spec-driven`): `/opsx-propose` → ревью → `/opsx-apply` → `/opsx-archive`. Корень — `openspec/` в этом репозитории.
- Не править вручную `.opencode/commands/`, `.opencode/skills/`, `.agents/` — они генерируются OpenSpec (`openspec update`/`init`).

## Подводные камни
- `src/setupTests.js` и `src/__tests__/App.test.js` существуют; `@testing-library/*` установлены.
- `.opencode/package.json` и `.opencode/node_modules` намеренно в `.opencode/.gitignore` — не коммитить.
- `.env` содержит только `REACT_APP_UI_VERSION`; базовый URL API задаётся через `REACT_APP_API_BASE_URL` (по умолчанию `http://localhost:8080`). Нет CI, Prettier, TypeScript.
- В `metrology-app` git remote содержит personal access token — не выводить и не коммитить; при необходимости заменить на credential helper.
