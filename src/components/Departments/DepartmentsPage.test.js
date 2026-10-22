import { fireEvent, render, screen, within } from '@testing-library/react';
import DepartmentsPage from './DepartmentsPage';

const originalFetch = global.fetch;

function pageResponse(content, { number = 0, totalPages = 1, last = true } = {}) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        content,
        number,
        totalPages,
        first: number === 0,
        last,
      }),
  });
}

function errorResponse(message, status = 400) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ message, status }),
  });
}

function createdResponse(body) {
  return Promise.resolve({
    ok: true,
    status: 201,
    json: () => Promise.resolve(body),
  });
}

function arrayResponse(body) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

function postPayload(call) {
  return JSON.parse(call[1].body);
}

const factory = {
  id: 1,
  name: 'Завод «ЭлектронПрибор»',
  type: 'FACTORY',
  parent: null,
  children: [],
  hasChildren: true,
};

afterEach(() => {
  global.fetch = originalFetch;
});

test('показывает индикатор загрузки корневого списка', () => {
  global.fetch = jest.fn(() => new Promise(() => {}));

  render(<DepartmentsPage />);

  expect(screen.getByRole('status')).toHaveTextContent('Загрузка…');
});

test('отображает департаменты корневого списка', async () => {
  global.fetch = jest.fn(() => pageResponse([factory]));

  render(<DepartmentsPage />);

  expect(await screen.findByText(factory.name)).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/departments/all-by-type?page=0&size=10&type=FACTORY&sortBy=ASC')
  );
});

test('показывает сообщение при пустом корневом списке', async () => {
  global.fetch = jest.fn(() => pageResponse([], { totalPages: 0 }));

  render(<DepartmentsPage />);

  expect(await screen.findByText('Департаменты не найдены')).toBeInTheDocument();
});

test('показывает ошибку и повторяет запрос по кнопке', async () => {
  global.fetch = jest
    .fn()
    .mockImplementationOnce(() => errorResponse('Сервер недоступен', 500))
    .mockImplementationOnce(() => pageResponse([factory]));

  render(<DepartmentsPage />);

  expect(
    await screen.findByText('Не удалось загрузить департаменты: Сервер недоступен')
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

  expect(await screen.findByText(factory.name)).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('отображает колонки таблицы, легенду, тип и родителя', async () => {
  const workshop = {
    id: 2,
    name: 'Цех № 1',
    type: 'WORKSHOP',
    parent: { id: 1, name: factory.name, type: 'FACTORY' },
    children: [],
    hasChildren: false,
  };

  global.fetch = jest.fn(() => pageResponse([factory, workshop]));

  render(<DepartmentsPage />);

  expect(await screen.findByText('Цех № 1')).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Название' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Тип' })).toBeInTheDocument();
  expect(
    screen.getByRole('columnheader', { name: 'Родительское подразделение' })
  ).toBeInTheDocument();

  const legend = screen.getByRole('region', { name: 'Легенда' });
  expect(legend).toHaveTextContent('Завод');
  expect(legend).toHaveTextContent('Цех');
  expect(legend).toHaveTextContent('Участок');
  expect(legend).toHaveTextContent('Лаборатория');
  expect(legend).toHaveTextContent('Нажмите «+»');

  expect(screen.getAllByText('Завод').length).toBeGreaterThan(1);
  expect(screen.getAllByText(factory.name)).toHaveLength(2);
  expect(screen.getByText('—')).toBeInTheDocument();
});

test('переходит на другую страницу корневого списка', async () => {
  const secondFactory = {
    ...factory,
    id: 10,
    name: 'Завод «Второй»',
  };

  global.fetch = jest
    .fn()
    .mockImplementationOnce(() => pageResponse([factory], { number: 0, totalPages: 3, last: false }))
    .mockImplementationOnce(() =>
      pageResponse([secondFactory], { number: 1, totalPages: 3, last: false })
    );

  render(<DepartmentsPage />);

  expect(await screen.findByText(factory.name)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '2' }));

  expect(await screen.findByText(secondFactory.name)).toBeInTheDocument();
  expect(screen.queryByText(factory.name)).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('page=1'));
});

test('делает переход вперёд недоступным на последней странице', async () => {
  global.fetch = jest.fn(() =>
    pageResponse([factory], { number: 2, totalPages: 3, last: true })
  );

  render(<DepartmentsPage />);

  expect(await screen.findByText(factory.name)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Вперёд' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Назад' })).toBeEnabled();
});

test('раскрывает и сворачивает дерево на любую глубину', async () => {
  const workshop = {
    id: 2,
    name: 'Цех № 1',
    type: 'WORKSHOP',
    parent: { id: 1, name: factory.name, type: 'FACTORY' },
    children: [],
    hasChildren: true,
  };
  const laboratory = {
    id: 3,
    name: 'Лаборатория № 1',
    type: 'LABORATORY',
    parent: { id: 2, name: workshop.name, type: 'WORKSHOP' },
    children: [],
    hasChildren: false,
  };

  global.fetch = jest.fn((url) => {
    if (url.includes('/all-by-type')) {
      return pageResponse([factory]);
    }
    if (url.includes('parentId=1')) {
      return pageResponse([workshop]);
    }
    if (url.includes('parentId=2')) {
      return pageResponse([laboratory]);
    }
    return pageResponse([]);
  });

  render(<DepartmentsPage />);

  const factoryRow = await screen.findByRole('row', { name: factory.name });
  const factoryToggle = within(factoryRow).getByRole('button', {
    name: 'Раскрыть дочерние подразделения',
  });

  expect(factoryToggle).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(factoryToggle);

  const workshopRow = await screen.findByRole('row', { name: workshop.name });
  expect(
    within(factoryRow).getByRole('button', { name: 'Свернуть' })
  ).toHaveAttribute('aria-expanded', 'true');
  expect(workshopRow).toHaveAttribute('data-depth', '1');

  fireEvent.click(
    within(workshopRow).getByRole('button', {
      name: 'Раскрыть дочерние подразделения',
    })
  );

  const laboratoryRow = await screen.findByRole('row', {
    name: laboratory.name,
  });
  expect(laboratoryRow).toHaveAttribute('data-depth', '2');
  expect(
    within(laboratoryRow).queryByRole('button', {
      name: 'Раскрыть дочерние подразделения',
    })
  ).toBeNull();

  fireEvent.click(within(factoryRow).getByRole('button', { name: 'Свернуть' }));

  expect(screen.queryByText(workshop.name)).not.toBeInTheDocument();
  expect(screen.queryByText(laboratory.name)).not.toBeInTheDocument();
});

test('не повторяет запрос детей при повторном раскрытии', async () => {
  const workshop = {
    id: 2,
    name: 'Цех № 1',
    type: 'WORKSHOP',
    parent: { id: 1, name: factory.name, type: 'FACTORY' },
    children: [],
    hasChildren: false,
  };

  global.fetch = jest.fn((url) => {
    if (url.includes('/all-by-type')) {
      return pageResponse([factory]);
    }
    return pageResponse([workshop]);
  });

  render(<DepartmentsPage />);

  const factoryRow = await screen.findByRole('row', { name: factory.name });

  fireEvent.click(
    within(factoryRow).getByRole('button', {
      name: 'Раскрыть дочерние подразделения',
    })
  );
  await screen.findByText(workshop.name);

  fireEvent.click(within(factoryRow).getByRole('button', { name: 'Свернуть' }));
  expect(screen.queryByText(workshop.name)).not.toBeInTheDocument();

  fireEvent.click(
    within(factoryRow).getByRole('button', {
      name: 'Раскрыть дочерние подразделения',
    })
  );
  await screen.findByText(workshop.name);

  const childRequests = global.fetch.mock.calls.filter(([url]) =>
    url.includes('/by-parent?parentId=1')
  );
  expect(childRequests).toHaveLength(1);
});

test('добавляет следующую страницу дочерних без дублей', async () => {
  const firstWorkshop = {
    id: 2,
    name: 'Цех № 1',
    type: 'WORKSHOP',
    parent: { id: 1, name: factory.name, type: 'FACTORY' },
    children: [],
    hasChildren: false,
  };
  const secondWorkshop = {
    id: 4,
    name: 'Цех № 2',
    type: 'WORKSHOP',
    parent: { id: 1, name: factory.name, type: 'FACTORY' },
    children: [],
    hasChildren: false,
  };

  global.fetch = jest.fn((url) => {
    if (url.includes('/all-by-type')) {
      return pageResponse([factory]);
    }
    if (url.includes('parentId=1&page=0')) {
      return pageResponse([firstWorkshop], { number: 0, totalPages: 2, last: false });
    }
    if (url.includes('parentId=1&page=1')) {
      return pageResponse([firstWorkshop, secondWorkshop], {
        number: 1,
        totalPages: 2,
        last: true,
      });
    }
    return pageResponse([]);
  });

  render(<DepartmentsPage />);

  const factoryRow = await screen.findByRole('row', { name: factory.name });
  fireEvent.click(
    within(factoryRow).getByRole('button', {
      name: 'Раскрыть дочерние подразделения',
    })
  );

  await screen.findByText(firstWorkshop.name);

  fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));

  expect(await screen.findByText(secondWorkshop.name)).toBeInTheDocument();
  expect(screen.getAllByText(firstWorkshop.name)).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('parentId=1&page=1')
  );
});

test('показывает ошибку дочерних внутри узла и не скрывает остальные строки', async () => {
  const otherFactory = {
    id: 9,
    name: 'Завод «Соседний»',
    type: 'FACTORY',
    parent: null,
    children: [],
    hasChildren: false,
  };
  const workshop = {
    id: 2,
    name: 'Цех № 1',
    type: 'WORKSHOP',
    parent: { id: 1, name: factory.name, type: 'FACTORY' },
    children: [],
    hasChildren: false,
  };
  let childAttempts = 0;

  global.fetch = jest.fn((url) => {
    if (url.includes('/all-by-type')) {
      return pageResponse([factory, otherFactory]);
    }
    if (url.includes('parentId=1')) {
      childAttempts += 1;
      return childAttempts === 1
        ? errorResponse('Сбой загрузки', 500)
        : pageResponse([workshop]);
    }
    return pageResponse([]);
  });

  render(<DepartmentsPage />);

  const factoryRow = await screen.findByRole('row', { name: factory.name });
  expect(screen.getByText(otherFactory.name)).toBeInTheDocument();

  fireEvent.click(
    within(factoryRow).getByRole('button', {
      name: 'Раскрыть дочерние подразделения',
    })
  );

  expect(
    await screen.findByText('Не удалось загрузить дочерние подразделения')
  ).toBeInTheDocument();
  expect(screen.getByText(otherFactory.name)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

  expect(await screen.findByText(workshop.name)).toBeInTheDocument();
  expect(
    screen.queryByText('Не удалось загрузить дочерние подразделения')
  ).not.toBeInTheDocument();

  const childRequests = global.fetch.mock.calls.filter(([url]) =>
    url.includes('/by-parent?parentId=1')
  );
  expect(childRequests).toHaveLength(2);
});

test('открывает модальное окно создания', async () => {
  global.fetch = jest.fn(() => pageResponse([factory]));

  render(<DepartmentsPage />);
  await screen.findByText(factory.name);

  fireEvent.click(screen.getByRole('button', { name: 'Новый' }));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByLabelText('Название')).toBeInTheDocument();
  expect(screen.getByLabelText('Тип')).toBeInTheDocument();
  expect(screen.getByLabelText('Входит в состав')).toBeInTheDocument();
});

test('создаёт FACTORY и перезагружает корневой список', async () => {
  const newFactory = {
    ...factory,
    id: 5,
    name: 'Завод «Новый»',
    hasChildren: false,
  };
  let rootRequests = 0;

  global.fetch = jest.fn((url, options = {}) => {
    if (url.includes('/all-by-type')) {
      rootRequests += 1;
      return pageResponse(rootRequests === 1 ? [factory] : [factory, newFactory]);
    }
    if (url === 'http://localhost:8080/api/v1/departments' && options.method === 'POST') {
      return createdResponse(newFactory);
    }
    return pageResponse([]);
  });

  render(<DepartmentsPage />);
  await screen.findByText(factory.name);

  fireEvent.click(screen.getByRole('button', { name: 'Новый' }));
  fireEvent.change(screen.getByLabelText('Название'), {
    target: { value: 'Завод «Новый»' },
  });
  fireEvent.change(screen.getByLabelText('Тип'), {
    target: { value: 'FACTORY' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

  expect(
    await screen.findByText('Департамент «Завод «Новый»» создан')
  ).toBeInTheDocument();
  expect(await screen.findByText(newFactory.name)).toBeInTheDocument();

  const postCall = global.fetch.mock.calls.find(
    ([, options]) => options && options.method === 'POST'
  );
  expect(postCall[0]).toBe('http://localhost:8080/api/v1/departments');
  expect(postPayload(postCall)).toEqual({
    name: 'Завод «Новый»',
    type: 'FACTORY',
  });
  expect(rootRequests).toBe(2);
});

test('создаёт дочерний департамент и обновляет детей родителя', async () => {
  const existingWorkshop = {
    id: 2,
    name: 'Цех старый',
    type: 'WORKSHOP',
    parent: { id: 1, name: factory.name, type: 'FACTORY' },
    children: [],
    hasChildren: false,
  };
  const newWorkshop = {
    id: 3,
    name: 'Цех новый',
    type: 'WORKSHOP',
    parent: { id: 1, name: factory.name, type: 'FACTORY' },
    children: [],
    hasChildren: false,
  };
  let childRequests = 0;

  global.fetch = jest.fn((url, options = {}) => {
    if (url.includes('/all-by-type')) {
      return pageResponse([factory]);
    }
    if (url.includes('/by-parent?parentId=1')) {
      childRequests += 1;
      return pageResponse(
        childRequests === 1 ? [existingWorkshop] : [existingWorkshop, newWorkshop]
      );
    }
    if (url.includes('/search-by-name')) {
      return arrayResponse([factory]);
    }
    if (url === 'http://localhost:8080/api/v1/departments' && options.method === 'POST') {
      return createdResponse(newWorkshop);
    }
    return pageResponse([]);
  });

  render(<DepartmentsPage />);

  const factoryRow = await screen.findByRole('row', { name: factory.name });
  fireEvent.click(
    within(factoryRow).getByRole('button', {
      name: 'Раскрыть дочерние подразделения',
    })
  );
  await screen.findByText(existingWorkshop.name);

  fireEvent.click(screen.getByRole('button', { name: 'Новый' }));
  fireEvent.change(screen.getByLabelText('Название'), {
    target: { value: newWorkshop.name },
  });
  fireEvent.change(screen.getByLabelText('Тип'), {
    target: { value: 'WORKSHOP' },
  });

  const parentInput = screen.getByLabelText('Входит в состав');
  fireEvent.focus(parentInput);
  fireEvent.click(
    await screen.findByRole('option', { name: /Завод «ЭлектронПрибор»/ })
  );

  fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

  expect(await screen.findByText(newWorkshop.name)).toBeInTheDocument();
  expect(childRequests).toBe(2);
});

test('показывает ошибку дубликата и оставляет окно открытым', async () => {
  global.fetch = jest.fn((url, options = {}) => {
    if (url.includes('/all-by-type')) {
      return pageResponse([factory]);
    }
    if (url === 'http://localhost:8080/api/v1/departments' && options.method === 'POST') {
      return errorResponse('Департамент с таким названием уже существует', 400);
    }
    return pageResponse([]);
  });

  render(<DepartmentsPage />);
  await screen.findByText(factory.name);

  fireEvent.click(screen.getByRole('button', { name: 'Новый' }));
  fireEvent.change(screen.getByLabelText('Название'), {
    target: { value: factory.name },
  });
  fireEvent.change(screen.getByLabelText('Тип'), {
    target: { value: 'FACTORY' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

  expect(
    await screen.findByText('Департамент с таким названием уже существует')
  ).toBeInTheDocument();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
