import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DepartmentDeleteModal from './DepartmentDeleteModal';

const originalFetch = global.fetch;

const department = {
  id: 7,
  name: 'Цех № 7',
  type: 'WORKSHOP',
  parent: { id: 1, name: 'Завод', type: 'FACTORY' },
  children: [],
  hasChildren: false,
};

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

function noContentResponse() {
  return Promise.resolve({
    ok: true,
    status: 204,
    json: () => Promise.reject(new Error('no body')),
  });
}

function checkResponse(check) {
  return jsonResponse(check);
}

function setupFetch({ check = { canDelete: true, blockers: [] }, onDelete } = {}) {
  global.fetch = jest.fn((url, options = {}) => {
    if (options.method === 'DELETE') {
      return onDelete ? onDelete(url, options) : noContentResponse();
    }

    if (url.includes('/deletion-check')) {
      return checkResponse(check);
    }

    return jsonResponse({});
  });
}

function renderModal({
  target = department,
  onClose = jest.fn(),
  onDeleted = jest.fn(),
  onShowChildren = jest.fn(),
} = {}) {
  render(
    <DepartmentDeleteModal
      department={target}
      onClose={onClose}
      onDeleted={onDeleted}
      onShowChildren={onShowChildren}
    />
  );

  return { onClose, onDeleted, onShowChildren };
}

function deleteCalls() {
  return global.fetch.mock.calls.filter(([, options]) => options && options.method === 'DELETE');
}

afterEach(() => {
  jest.useRealTimers();
  global.fetch = originalFetch;
});

test('блокирует удаление департамента с детьми без запросов', () => {
  global.fetch = jest.fn();

  const { onShowChildren } = renderModal({
    target: { ...department, hasChildren: true },
  });

  expect(screen.getByText('Удаление невозможно')).toBeInTheDocument();
  expect(screen.getByText(/дочерние подразделения/)).toBeInTheDocument();
  expect(screen.queryByLabelText(/Введите название/)).not.toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Показать дочерние' }));
  expect(onShowChildren).toHaveBeenCalledWith(
    expect.objectContaining({ id: department.id })
  );
});

test('блокирует удаление по сотрудникам из проверки', async () => {
  setupFetch({
    check: {
      canDelete: false,
      blockers: [
        { type: 'EMPLOYEES', count: 3 },
        { type: 'MEASUREMENTS', count: 0 },
      ],
    },
  });

  renderModal();

  expect(await screen.findByText('Удаление невозможно')).toBeInTheDocument();
  expect(screen.getByText('сотрудники — 3')).toBeInTheDocument();
  expect(screen.queryByText(/измерения/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Показать дочерние' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Введите название/)).not.toBeInTheDocument();
});

test('блокирует удаление по детям, найденным проверкой', async () => {
  setupFetch({
    check: { canDelete: false, blockers: [{ type: 'CHILDREN', count: 2 }] },
  });

  renderModal();

  expect(await screen.findByText('Удаление невозможно')).toBeInTheDocument();
  expect(screen.getByText('дочерние подразделения — 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Показать дочерние' })).toBeInTheDocument();
});

test('переходит к подтверждению и сравнивает имя с учётом регистра', async () => {
  const onClose = jest.fn();
  setupFetch();

  renderModal({ onClose });

  const input = await screen.findByLabelText(/Введите название/);
  const deleteButton = screen.getByRole('button', { name: 'Удалить' });

  expect(
    screen.getByText(department.name, { selector: 'strong' })
  ).toHaveClass('delete-modal__warning-name');
  expect(deleteButton).toBeDisabled();

  fireEvent.change(input, { target: { value: department.name.toLowerCase() } });
  expect(deleteButton).toBeDisabled();

  fireEvent.change(input, { target: { value: `  ${department.name}  ` } });
  expect(deleteButton).toBeEnabled();

  fireEvent.change(input, { target: { value: 'другое' } });
  expect(deleteButton).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
  expect(onClose).toHaveBeenCalled();
});

test('показывает проверку, пока не пришёл ответ', () => {
  global.fetch = jest.fn(() => new Promise(() => {}));

  renderModal();

  expect(screen.getByRole('status')).toHaveTextContent('Проверка возможности удаления…');
});

test('при ошибке проверки разрешает попытку удаления', async () => {
  global.fetch = jest.fn(() =>
    Promise.reject(Object.assign(new Error('Not Found'), { status: 404 }))
  );

  renderModal();

  expect(await screen.findByLabelText(/Введите название/)).toBeInTheDocument();
  expect(screen.queryByText('Удаление невозможно')).not.toBeInTheDocument();
});

test('отменяет отсчёт без отправки DELETE', async () => {
  jest.useFakeTimers();
  setupFetch();

  renderModal();

  const input = await screen.findByLabelText(/Введите название/);
  fireEvent.change(input, { target: { value: department.name } });
  fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

  expect(screen.getByRole('timer')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Отменить удаление' }));

  expect(await screen.findByLabelText(/Введите название/)).toBeInTheDocument();
  expect(input).toHaveValue(department.name);

  act(() => {
    jest.advanceTimersByTime(6000);
  });

  expect(deleteCalls()).toHaveLength(0);
});

test('закрывает окно во время отсчёта без отправки DELETE', async () => {
  jest.useFakeTimers();
  const onClose = jest.fn();
  setupFetch();

  const { unmount } = render(
    <DepartmentDeleteModal
      department={department}
      onClose={onClose}
      onDeleted={jest.fn()}
      onShowChildren={jest.fn()}
    />
  );

  const input = await screen.findByLabelText(/Введите название/);
  fireEvent.change(input, { target: { value: department.name } });
  fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

  fireEvent.keyDown(document, { key: 'Escape' });

  expect(onClose).toHaveBeenCalled();

  unmount();

  await act(async () => {
    jest.advanceTimersByTime(6000);
  });

  expect(deleteCalls()).toHaveLength(0);
});

test('отправляет ровно один DELETE после пяти секунд даже в StrictMode', async () => {
  jest.useFakeTimers();
  const onDeleted = jest.fn();
  setupFetch();

  render(
    <StrictMode>
      <DepartmentDeleteModal
        department={department}
        onClose={jest.fn()}
        onDeleted={onDeleted}
        onShowChildren={jest.fn()}
      />
    </StrictMode>
  );

  const input = await screen.findByLabelText(/Введите название/);
  fireEvent.change(input, { target: { value: department.name } });

  act(() => {
    jest.advanceTimersByTime(4000);
  });
  expect(deleteCalls()).toHaveLength(0);

  fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });

  await waitFor(() => {
    expect(onDeleted).toHaveBeenCalledWith(
      expect.objectContaining({ id: department.id })
    );
  });

  expect(deleteCalls()).toHaveLength(1);
});

test('показывает ошибку, блокирует закрытие во время запроса и повторяет удаление', async () => {
  jest.useFakeTimers();
  let resolveDelete;
  let attempts = 0;
  const onDeleted = jest.fn();
  const onClose = jest.fn();

  setupFetch({
    onDelete: () => {
      attempts += 1;

      if (attempts === 1) {
        return Promise.reject(Object.assign(new Error('Сбой удаления'), { status: 500 }));
      }

      return new Promise((resolve) => {
        resolveDelete = () => resolve(noContentResponse());
      });
    },
  });

  renderModal({ onDeleted, onClose });

  const input = await screen.findByLabelText(/Введите название/);
  fireEvent.change(input, { target: { value: department.name } });
  fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });

  expect(await screen.findByText('Сбой удаления')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(screen.getByRole('timer')).toBeInTheDocument();

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });

  expect(screen.getByRole('status')).toHaveTextContent('Удаление…');
  expect(screen.getByRole('button', { name: 'Закрыть' })).toBeDisabled();

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();

  await act(async () => {
    resolveDelete();
  });

  await waitFor(() => {
    expect(onDeleted).toHaveBeenCalledWith(
      expect.objectContaining({ id: department.id })
    );
  });
  expect(attempts).toBe(2);
});

test('при 404 сообщает странице, что департамент уже удалён', async () => {
  jest.useFakeTimers();
  const onDeleted = jest.fn();

  setupFetch({
    onDelete: () => Promise.reject(Object.assign(new Error('Не найден'), { status: 404 })),
  });

  renderModal({ onDeleted });

  const input = await screen.findByLabelText(/Введите название/);
  fireEvent.change(input, { target: { value: department.name } });
  fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });

  await waitFor(() => {
    expect(onDeleted).toHaveBeenCalledWith(
      expect.objectContaining({ id: department.id }),
      { alreadyDeleted: true }
    );
  });
});

test('закрывается по клику на оверлей', async () => {
  const onClose = jest.fn();
  setupFetch();

  renderModal({ onClose });

  await screen.findByLabelText(/Введите название/);

  fireEvent.click(screen.getByTestId('delete-modal-overlay'));

  expect(onClose).toHaveBeenCalled();
});
