# Tasks

## 1. Слой API

- [x] 1.1 Создать `src/services/constants.js` (`ROOT_TYPE`, `PAGE_SIZE`, типы и русские подписи) и `src/services/departments.js` с `fetchRootPage` и `fetchChildrenPage`: базовый URL из `REACT_APP_API_BASE_URL` (по умолчанию `http://localhost:8080`), `URLSearchParams`, проверка `response.ok`, извлечение `message`; `npx eslint src/services` проходит.
- [x] 1.2 Добавить `src/services/departments.test.js` на формирование URL, разбор успешного `Page` и ошибки `400` с моком `fetch`; `npm test -- --watchAll=false src/services/departments.test.js` проходит.

## 2. Каркас приложения и навигация

- [x] 2.1 Заменить заглушку `src/App.js` на `Layout` из `src/components/Layout/Layout.js` с боковым меню и областью контента, стили — в `src/App.css`; `npm run build` завершается без ошибок.
- [x] 2.2 Реализовать переключение разделов: «Департаменты» открывает каталог, «Приборы» и «Сотрудники» показывают «Появится скоро»; тест `src/__tests__/App.test.js` проходит через `npm test -- --watchAll=false src/__tests__/App.test.js`.

## 3. Корневой список и пагинация

- [x] 3.1 Реализовать `DepartmentsPage` в `src/components/Departments/DepartmentsPage.js` с загрузкой корня (`type=FACTORY`, `size=10`, `sortBy=ASC`), состояниями загрузки, пустоты, ошибки и повтором; тесты `DepartmentsPage.test.js` проходят.
- [x] 3.2 Реализовать таблицу с колонками «Название», «Тип», «Родительское подразделение» (для корня — «—») и легенду с названиями типов и подсказкой; тесты отображения проходят через `npm test -- --watchAll=false src/components/Departments`.
- [x] 3.3 Реализовать навигацию по страницам корня и недоступность перехода вперёд на последней странице; тесты пагинации проходят.

## 4. Дерево и дочерние страницы

- [x] 4.1 Реализовать плоский рендер дерева с отступом по `depth`, кнопкой «+»/«−» только при `hasChildren`, placeholder для листьев и `aria-expanded` с доступным именем; тесты раскрытия, сворачивания и листа проходят.
- [x] 4.2 Добавить кэш дочерних страниц по `parentId`: повторное раскрытие не делает запрос; тест на количество вызовов `fetch` проходит.
- [x] 4.3 Реализовать «Показать ещё» для дочерних (`last === false`), добавление без дублей и скрытие кнопки на последней странице; тесты проходят.
- [x] 4.4 Реализовать ошибку загрузки детей внутри узла с «Повторить», не скрывая остальные строки; тест ошибки проходит.

## 5. Интеграционная проверка

- [x] 5.1 Прогнать `npx eslint src` и устранить замечания.
- [x] 5.2 Прогнать `npm test -- --watchAll=false` — все тесты зелёные.
- [x] 5.3 Прогнать `npm run build` — production-сборка успешна.
- [x] 5.4 Проверить вручную с бэкендом на `localhost:8080` и `npm start`: только `FACTORY` в корне, «+» раскрывает детей, «Показать ещё» работает, в консоли нет CORS-ошибок.

## Workflow follow-up

- Закоммитить в `metrology-app` изменения ветки `feature/11-find-all-epartment-by-pageable`: `/by-parent`, `hasChildren` и `CorsConfig`.
- Архивировать change после ревью и проверки.
