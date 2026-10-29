import {
  createDepartment,
  deleteDepartment,
  fetchChildrenPage,
  fetchDeletionCheck,
  fetchRootPage,
  searchDepartments,
} from './departments';

const originalFetch = global.fetch;

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

const rootPage = {
  content: [
    {
      id: 1,
      name: 'Завод «ЭлектронПрибор»',
      type: 'FACTORY',
      parent: null,
      children: [],
      hasChildren: true,
    },
  ],
  number: 0,
  size: 10,
  totalPages: 1,
  first: true,
  last: true,
};

afterEach(() => {
  global.fetch = originalFetch;
});

test('формирует URL запроса корневого списка', async () => {
  global.fetch = jest.fn(() => jsonResponse(rootPage));

  await fetchRootPage({ page: 2, size: 5, sortBy: 'DESC' });

  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:8080/api/v1/departments/all-by-type?page=2&size=5&type=FACTORY&sortBy=DESC'
  );
});

test('формирует URL запроса дочерних департаментов', async () => {
  global.fetch = jest.fn(() => jsonResponse(rootPage));

  await fetchChildrenPage({ parentId: 7, page: 1, size: 5, sortBy: 'ASC' });

  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:8080/api/v1/departments/by-parent?parentId=7&page=1&size=5&sortBy=ASC'
  );
});

test('возвращает разобранную страницу при успешном ответе', async () => {
  global.fetch = jest.fn(() => jsonResponse(rootPage));

  const page = await fetchRootPage();

  expect(page).toEqual(rootPage);
});

test('пробрасывает message из ответа 400', async () => {
  global.fetch = jest.fn(() =>
    jsonResponse(
      {
        message: 'Некорректный тип департамента: UNKNOWN',
        status: 400,
        timestamp: '2026-10-21T10:00:00',
      },
      { ok: false, status: 400 }
    )
  );

  await expect(fetchRootPage()).rejects.toThrow('Некорректный тип департамента: UNKNOWN');
});

test('использует запасное сообщение, если тело ошибки пустое', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    })
  );

  await expect(fetchRootPage()).rejects.toThrow('Ошибка запроса (500)');
});

test('создаёт департамент через POST с JSON-телом', async () => {
  const created = {
    id: 10,
    name: 'Цех № 10',
    type: 'WORKSHOP',
    parent: { id: 1, name: 'Завод', type: 'FACTORY' },
    children: [],
    hasChildren: false,
  };

  global.fetch = jest.fn(() => jsonResponse(created, { status: 201 }));

  const result = await createDepartment({
    name: 'Цех № 10',
    type: 'WORKSHOP',
    parentId: 1,
  });

  expect(result).toEqual(created);
  expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/v1/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Цех № 10', type: 'WORKSHOP', parentId: 1 }),
  });
});

test('не отправляет parentId для корневого департамента', async () => {
  global.fetch = jest.fn(() => jsonResponse({ id: 11 }, { status: 201 }));

  await createDepartment({ name: 'Новый завод', type: 'FACTORY' });

  expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/v1/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Новый завод', type: 'FACTORY' }),
  });
});

test('ищет департаменты по части имени с отменой запроса', async () => {
  const controller = new AbortController();
  const found = [{ id: 2, name: 'Цех сборки', type: 'WORKSHOP' }];

  global.fetch = jest.fn(() => jsonResponse(found));

  const result = await searchDepartments('цех', { signal: controller.signal });

  expect(result).toEqual(found);
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:8080/api/v1/departments/search-by-name?search=%D1%86%D0%B5%D1%85',
    { signal: controller.signal }
  );
});

test('пробрасывает message из ошибки создания', async () => {
  global.fetch = jest.fn(() =>
    jsonResponse(
      {
        message: 'Департамент с таким названием уже существует',
        status: 400,
      },
      { ok: false, status: 400 }
    )
  );

  await expect(
    createDepartment({ name: 'Цех сборки', type: 'WORKSHOP', parentId: 1 })
  ).rejects.toThrow('Департамент с таким названием уже существует');
});

test('удаляет департамент через DELETE и возвращает null для 204', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('no body')),
    })
  );

  await expect(deleteDepartment(7)).resolves.toBeNull();
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:8080/api/v1/departments/7',
    { method: 'DELETE' }
  );
});

test('возвращает тело DELETE 200 "123" без падения', async () => {
  global.fetch = jest.fn(() => jsonResponse('123'));

  await expect(deleteDepartment(7)).resolves.toBe('123');
});

test('возвращает null для пустого тела успешного ответа', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('Unexpected end of JSON input')),
    })
  );

  await expect(deleteDepartment(7)).resolves.toBeNull();
});

test('сохраняет status в ошибке DELETE', async () => {
  global.fetch = jest.fn(() =>
    jsonResponse(
      {
        message: 'Не удалось удалить департамент',
        status: 400,
      },
      { ok: false, status: 400 }
    )
  );

  await expect(deleteDepartment(7)).rejects.toMatchObject({
    message: 'Не удалось удалить департамент',
    status: 400,
  });
});

test('запрашивает проверку удаления по id', async () => {
  const check = {
    canDelete: false,
    blockers: [
      { type: 'CHILDREN', count: 3 },
      { type: 'EMPLOYEES', count: 12 },
      { type: 'MEASUREMENTS', count: 0 },
    ],
  };

  global.fetch = jest.fn(() => jsonResponse(check));

  await expect(fetchDeletionCheck(5)).resolves.toEqual(check);
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:8080/api/v1/departments/5/deletion-check'
  );
});

test('различает статусы ошибок проверки удаления и сетевую ошибку', async () => {
  for (const status of [404, 501, 400]) {
    global.fetch = jest.fn(() =>
      jsonResponse({ message: `Ошибка ${status}` }, { ok: false, status })
    );

    await expect(fetchDeletionCheck(5)).rejects.toMatchObject({ status });
  }

  global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));

  const networkError = await fetchDeletionCheck(5).catch((error) => error);

  expect(networkError).toBeInstanceOf(TypeError);
  expect(networkError.status).toBeUndefined();
});
