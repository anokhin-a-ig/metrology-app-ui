import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DepartmentCreateModal from './DepartmentCreateModal';
import { createDepartment } from '../../services/departments';

jest.mock('../../services/departments', () => ({
  createDepartment: jest.fn(),
}));

jest.mock('./ParentCombobox', () => {
  return function MockParentCombobox({
    id,
    value,
    onChange,
    disabled,
    placeholder,
    error,
  }) {
    return (
      <div>
        <input
          id={id}
          readOnly
          value={value ? value.name : ''}
          disabled={disabled}
          placeholder={placeholder}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange({ id: 1, name: 'Завод «ЭлектронПрибор»', type: 'FACTORY' })
          }
        >
          Выбрать родителя
        </button>
        {error && <span role="alert">{error}</span>}
      </div>
    );
  };
});

const created = {
  id: 20,
  name: 'Цех новый',
  type: 'WORKSHOP',
  parent: { id: 1, name: 'Завод «ЭлектронПрибор»', type: 'FACTORY' },
  children: [],
  hasChildren: false,
};

function renderModal() {
  const onClose = jest.fn();
  const onCreated = jest.fn();

  render(<DepartmentCreateModal onClose={onClose} onCreated={onCreated} />);

  return { onClose, onCreated };
}

function fillName(value) {
  fireEvent.change(screen.getByLabelText('Название'), { target: { value } });
}

function selectType(value) {
  fireEvent.change(screen.getByLabelText('Тип'), { target: { value } });
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('показывает поля и блокирует родителя до выбора типа', () => {
  renderModal();

  expect(screen.getByLabelText('Название')).toHaveValue('');
  expect(screen.getByLabelText('Тип')).toHaveValue('');
  expect(screen.getByLabelText('Входит в состав')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Добавить' })).toHaveClass(
    'modal__button--submit'
  );
  expect(screen.getByRole('button', { name: 'Отмена' })).toHaveClass(
    'modal__button--cancel'
  );
});

test('очищает и блокирует родителя для FACTORY', () => {
  renderModal();

  selectType('WORKSHOP');
  fireEvent.click(screen.getByRole('button', { name: 'Выбрать родителя' }));
  expect(screen.getByLabelText('Входит в состав')).toHaveValue(
    'Завод «ЭлектронПрибор»'
  );

  selectType('FACTORY');

  expect(screen.getByLabelText('Входит в состав')).toBeDisabled();
  expect(screen.getByLabelText('Входит в состав')).toHaveValue('');
});

test('валидирует название и тип', async () => {
  renderModal();

  fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

  expect(await screen.findByText('Введите название департамента')).toBeInTheDocument();
  expect(screen.getByText('Выберите тип департамента')).toBeInTheDocument();
  expect(createDepartment).not.toHaveBeenCalled();
});

test('требует родителя для дочернего типа', async () => {
  renderModal();

  fillName('Цех новый');
  selectType('WORKSHOP');
  fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

  expect(await screen.findByText('Выберите родительский департамент')).toBeInTheDocument();
  expect(createDepartment).not.toHaveBeenCalled();
});

test('отправляет форму и передаёт созданный департамент', async () => {
  createDepartment.mockResolvedValue(created);
  const { onCreated } = renderModal();

  fillName('  Цех новый  ');
  selectType('WORKSHOP');
  fireEvent.click(screen.getByRole('button', { name: 'Выбрать родителя' }));
  fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

  await waitFor(() => {
    expect(createDepartment).toHaveBeenCalledWith({
      name: 'Цех новый',
      type: 'WORKSHOP',
      parentId: 1,
    });
  });
  expect(onCreated).toHaveBeenCalledWith(created);
});

test('не требует родителя для FACTORY', async () => {
  createDepartment.mockResolvedValue({ ...created, type: 'FACTORY', parent: null });
  renderModal();

  fillName('Новый завод');
  selectType('FACTORY');
  fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

  await waitFor(() => {
    expect(createDepartment).toHaveBeenCalledWith({
      name: 'Новый завод',
      type: 'FACTORY',
      parentId: undefined,
    });
  });
});

test('показывает ошибку сервера и не закрывает окно', async () => {
  createDepartment.mockRejectedValue(
    new Error('Департамент с таким названием уже существует')
  );
  const { onCreated } = renderModal();

  fillName('Цех новый');
  selectType('WORKSHOP');
  fireEvent.click(screen.getByRole('button', { name: 'Выбрать родителя' }));
  fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

  expect(
    await screen.findByText('Департамент с таким названием уже существует')
  ).toBeInTheDocument();
  expect(onCreated).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('закрывается по кнопке Отмена', () => {
  const { onClose } = renderModal();

  fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

  expect(onClose).toHaveBeenCalledTimes(1);
});
