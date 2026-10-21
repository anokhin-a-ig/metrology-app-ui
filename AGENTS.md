# AGENTS.md

## Состояние проекта
- Create React App + React 19, JavaScript (без TypeScript). `App` — пока дефолтная заглушка CRA.
- `src/logo.svg` и `src/reportWebVitals.js` удалены — не импортировать их (импорты из CRA-заглушки уже убраны, `npm start`/`npm run build` проходят).
- `README.md` — стандартный CRA-шаблон, не описывает проект. Требования: `openspec/department-table.md` и `openspec/specs/department-catalog/spec.md`.

## Команды
- `npm install`
- `npm start` — dev-сервер на http://localhost:3000
- `npm test -- --watchAll=false` — все тесты; один файл: `npm test -- --watchAll=false src/__tests__/Foo.test.js`
- `npm run build` — production-сборка, также показывает ошибки ESLint
- Отдельных `lint`/`typecheck` нет. ESLint 8 (`react-app` preset): `npx eslint src`
- OpenSpec CLI 1.14.1 установлен глобально: `openspec list --json`, `openspec status --change <name> --json`

## Архитектура
- Точка входа: `src/index.js` → `src/App.js`.
- Запланированные каталоги: `src/components/Departments`, `src/components/Layout`, `src/services` — пусты, Git их не отслеживает.
- Только React + CSS (`src/App.css`, `src/index.css`); нет роутера, стейт-менеджера и UI-библиотеки.

## Конвенции
- Спецификации, задачи и текст UI — на русском.
- Фичи вести через OpenSpec (schema `spec-driven`): `/opsx-propose` → ревью → `/opsx-apply` → `/opsx-archive`. Корень — `openspec/` в этом репозитории.
- Не править вручную `.opencode/commands/`, `.opencode/skills/`, `.agents/` — они генерируются OpenSpec (`openspec update`/`init`).

## Подводные камни
- `App.test.js` и `setupTests.js` удалены; `@testing-library/*` установлены, но тестовых файлов ноль.
- `.opencode/package.json` и `.opencode/node_modules` намеренно в `.opencode/.gitignore` — не коммитить.
- `.env` нет; слой API (`src/services`) еще не реализован. Нет CI, Prettier, TypeScript.
