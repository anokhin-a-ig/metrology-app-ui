# Tasks

## 1. Бэкенд: уникальность и поиск

- [ ] 1.1 Добавить Liquibase changeset `03-department-name-icu-index.xml` с precondition и `CREATE UNIQUE INDEX ux_department_name_lower_icu`, подключить его в `db.changelog-master.xml`; проверить `.\mvnw.cmd -DskipTests compile` и наличие индекса в `pg_indexes`.
- [ ] 1.2 Перевести `DepartmentRepository` на native-запросы `existsByNameCaseInsensitive` и `searchByNameCaseInsensitive` с `lower(... COLLATE "ru-RU-x-icu")` и `strpos`; удалить неиспользуемые `existsByName` и `findDepartmentByNameContainsIgnoreCase`; проверить компиляцию.
- [ ] 1.3 Обновить `DepartmentService`: trim, вызов новых методов, `@Transactional(readOnly = true)` для поиска; проверить unit-тестами нормализацию входа.
- [ ] 1.4 Перевести `DepartmentDtoService.searchByName` на `DepartmentDto` и `DepartmentController.searchByName` на `List<DepartmentDto>`; проверить компиляцию и отсутствие обращений к `children`/`parent` в поиске.
- [ ] 1.5 Добавить в `GlobalExceptionHandler` обработку `DataIntegrityViolationException` с сообщением о дубликате; проверить тестом или ручным запросом, что дубликат возвращает `400`, а не `500`.
- [ ] 1.6 Прогнать `.\mvnw.cmd test`; все тесты проходят.

## 2. Фронтенд: API-слой

- [ ] 2.1 Расширить `src/services/departments.js`: `createDepartment` с `POST`/JSON и `searchDepartments` с `signal`; сохранить разбор `message` ошибок.
- [ ] 2.2 Добавить тесты в `src/services/departments.test.js` на URL поиска, тело и метод POST, разбор `400`; проверить `npm test -- --watchAll=false src/services/departments.test.js`.

## 3. Фронтенд: модальное окно и combobox

- [ ] 3.1 Создать `ParentCombobox` с debounce, `AbortController`, клавиатурной навигацией, состояниями загрузки/пустоты/ошибки и очисткой выбора; проверить компонентными тестами.
- [ ] 3.2 Создать `DepartmentCreateModal`: порядок полей, блокировка родителя для `FACTORY`, обязательность родителя для остальных типов, клиентская валидация, зелёная/красная кнопки, закрытие по Esc/overlay; проверить тестами.
- [ ] 3.3 Добавить стили модального окна, полей, combobox и кнопок в `DepartmentsPage.css`; проверить `npm run build`.

## 4. Фронтенд: интеграция и обновление дерева

- [ ] 4.1 Добавить кнопку «Новый» и состояние модального окна в `DepartmentsPage`, реализовать `handleCreated` с перезагрузкой корня или детей родителя и обновлением `hasChildren`; проверить тестами сценарии `FACTORY` и дочернего департамента.
- [ ] 4.2 Добавить сообщение об успехе и сохранение открытого окна при ошибке сервера; проверить тестом дубликата.
- [ ] 4.3 Обновить существующие тесты `DepartmentsPage.test.js` под новые запросы; проверить `npm test -- --watchAll=false src/components/Departments`.

## 5. Интеграционная проверка

- [ ] 5.1 Прогнать `npx eslint src`, `npm test -- --watchAll=false` и `npm run build`; ошибок нет.
- [ ] 5.2 Проверить вручную с запущенными бэкендом и `npm start`: создание завода, создание цеха с поиском родителя, дубликат в другом регистре, обновление дерева без потери раскрытых узлов.

## Workflow follow-up

- Архивировать change после ревью и проверки.
- Проверить, что основная спека `department-catalog` после архивации содержит и старое поведение каталога, и новое требование создания.
