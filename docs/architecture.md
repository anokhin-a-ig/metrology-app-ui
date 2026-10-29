# Архитектура metrology-app-ui

## Назначение и границы

Одностраничное приложение для просмотра и редактирования каталога департаментов
системы метрологии. Приложение не хранит состояние на сервере и не выполняет
аутентификацию: все данные приходят из REST API бэкенда.

Вне границ документа: внутреннее устройство бэкенда, модель сотрудников и
измерений (кроме зависимостей при удалении департамента), инфраструктура деплоя.

## Контекст

```text
Браузер
  └── metrology-app-ui (React 19, CRA)
        └── HTTP/JSON → metrology-app (Spring Boot, /api/v1)
                          └── PostgreSQL
```

Бэкенд — отдельный репозиторий `D:\IDEA_projects\metrology-app`.
Его OpenSpec подключён к этому репозиторию как store `metrology-backend`
(см. `references` в `openspec/config.yaml`).

## Технологии

- React 19, Create React App 5 (`react-scripts`), JavaScript без TypeScript.
- Стили — обычный CSS: `src/index.css`, `src/App.css`, `src/components/Departments/DepartmentsPage.css`.
- Тесты — Jest + Testing Library через `react-scripts test`.
- Роутера, стейт-менеджера и UI-библиотеки нет.

## Структура фронтенда

```text
src/index.js
  └── App
        └── components/Layout/Layout
              └── components/Departments/DepartmentsPage
                    ├── DepartmentTable
                    ├── Pagination
                    ├── Legend
                    ├── DepartmentCreateModal
                    └── DepartmentDeleteModal (в разработке)
src/services
  ├── departments.js   — единственная точка вызова Department API
  ├── constants.js     — типы, размер страницы, сортировка
  └── version.js       — версия UI и /actuator/info
```

Правило: компоненты не вызывают `fetch` напрямую, только функции из `src/services`.

## Поток данных

1. `DepartmentsPage` запрашивает страницу корневых департаментов и хранит
   `content`, номер страницы, `totalPages`, `last`.
2. Раскрытие узла запрашивает дочерние департаменты по `parentId`; они кэшируются
   в `childrenByParent`, раскрытые узлы — в `expanded`.
3. Создание, удаление и поиск идут через сервисный слой; после мутации страница
   перезапрашивает затронутый список.
4. Ошибки запросов показываются в состоянии страницы или модального окна,
   не разрушая уже загруженную таблицу.

## Интеграция с бэкендом

Базовый URL: `REACT_APP_API_BASE_URL`, по умолчанию `http://localhost:8080`.
В dev CRA проксирует запросы на `http://localhost:8080` (поле `proxy` в `package.json`).

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/v1/departments/all-by-type` | страница корневых по `page`, `size`, `type`, `sortBy` |
| GET | `/api/v1/departments/by-parent` | страница дочерних по `parentId`, `page`, `size`, `sortBy` |
| GET | `/api/v1/departments/{id}` | департамент по id |
| GET | `/api/v1/departments/search-by-name` | поиск по `search` |
| POST | `/api/v1/departments` | создание `{ name, type, parentId? }` → `201` |
| PUT | `/api/v1/departments/{id}` | изменение |
| DELETE | `/api/v1/departments/{id}` | удаление; целевой ответ — `204` |
| GET | `/api/v1/departments/{id}/deletion-check` | проверка зависимостей (в разработке) |
| GET | `/actuator/info` | версия бэкенда |

Ответ департамента:

```json
{
  "id": 1,
  "name": "Завод",
  "type": "FACTORY",
  "parent": { "id": null, "name": null, "type": null },
  "children": [],
  "hasChildren": true
}
```

Страница — стандартный Spring `Page`: `content`, `number`, `size`,
`totalElements`, `totalPages`, `first`, `last`.

Ошибки — `{ "message": "...", "status": 400, "timestamp": "..." }`.
`src/services/departments.js` извлекает `message`; при не-JSON теле и сетевой
ошибке показывается общий текст.

## Обработка ошибок и состояний

- Загрузка: `loading` / `error` / пустой список.
- Создание: ошибка валидации и дубликата имени приходит в `message`.
- Удаление: проверка зависимостей, блокировка, отсчёт, повтор, `404` для уже
  удалённого департамента.
- Отмена запросов поиска — через `AbortSignal`.

## Тестирование и проверки

- `npm test -- --watchAll=false` — Jest/Testing Library.
- `npx eslint src` — ESLint (`react-app`).
- `npm run build` — production-сборка.

## Связанные артефакты

- Поведение каталога: `openspec/specs/department-catalog/spec.md`.
- Контракт API глазами UI: `openspec/specs/department-api/spec.md`.
- Детальный контракт API: OpenSpec репозитория `metrology-app` (store `metrology-backend`).
- История решений: `openspec/changes/archive/*/design.md`.
