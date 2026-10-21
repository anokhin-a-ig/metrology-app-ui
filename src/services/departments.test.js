import { fetchChildrenPage, fetchRootPage } from './departments';

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
