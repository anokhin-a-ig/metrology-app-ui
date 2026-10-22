import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ParentCombobox from './ParentCombobox';
import { searchDepartments } from '../../services/departments';

jest.mock('../../services/departments', () => ({
  searchDepartments: jest.fn(),
}));

const factory = { id: 1, name: 'Завод «ЭлектронПрибор»', type: 'FACTORY' };
const workshop = { id: 2, name: 'Цех сборки', type: 'WORKSHOP' };

beforeEach(() => {
  jest.clearAllMocks();
});

test('загружает и показывает варианты при фокусе', async () => {
  searchDepartments.mockResolvedValue([factory, workshop]);
  const handleChange = jest.fn();

  render(<ParentCombobox value={null} onChange={handleChange} />);

  fireEvent.focus(screen.getByRole('combobox'));

  expect(
    await screen.findByRole('option', { name: /Завод «ЭлектронПрибор»/ })
  ).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /Цех сборки/ })).toBeInTheDocument();
  expect(searchDepartments).toHaveBeenCalledWith('', expect.anything());
});

test('ищет по введённому тексту после задержки', async () => {
  searchDepartments.mockResolvedValue([workshop]);
  const handleChange = jest.fn();

  render(<ParentCombobox value={null} onChange={handleChange} />);

  const input = screen.getByRole('combobox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'цех' } });

  await waitFor(
    () => {
      expect(searchDepartments).toHaveBeenLastCalledWith('цех', expect.anything());
    },
    { timeout: 1000 }
  );
});

test('выбирает вариант и передаёт его наружу', async () => {
  searchDepartments.mockResolvedValue([factory, workshop]);
  const handleChange = jest.fn();

  render(<ParentCombobox value={null} onChange={handleChange} />);

  const input = screen.getByRole('combobox');
  fireEvent.focus(input);

  fireEvent.click(await screen.findByRole('option', { name: /Цех сборки/ }));

  expect(handleChange).toHaveBeenCalledWith(workshop);
  expect(input).toHaveValue('Цех сборки');
});

test('очищает выбранный родитель', () => {
  const handleChange = jest.fn();

  render(<ParentCombobox value={factory} onChange={handleChange} />);

  fireEvent.click(screen.getByRole('button', { name: 'Очистить выбор' }));

  expect(handleChange).toHaveBeenCalledWith(null);
  expect(screen.getByRole('combobox')).toHaveValue('');
});

test('не ищет и не открывает список в disabled-состоянии', () => {
  const handleChange = jest.fn();

  render(<ParentCombobox value={null} onChange={handleChange} disabled />);

  fireEvent.focus(screen.getByRole('combobox'));

  expect(screen.getByRole('combobox')).toBeDisabled();
  expect(searchDepartments).not.toHaveBeenCalled();
});

test('показывает ошибку поиска и повторяет запрос', async () => {
  searchDepartments
    .mockRejectedValueOnce(new Error('Сервер недоступен'))
    .mockResolvedValueOnce([factory]);
  const handleChange = jest.fn();

  render(<ParentCombobox value={null} onChange={handleChange} />);

  fireEvent.focus(screen.getByRole('combobox'));

  expect(await screen.findByText('Сервер недоступен')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

  expect(
    await screen.findByRole('option', { name: /Завод «ЭлектронПрибор»/ })
  ).toBeInTheDocument();
});

test('выбирает вариант клавиатурой', async () => {
  searchDepartments.mockResolvedValue([factory]);
  const handleChange = jest.fn();

  render(<ParentCombobox value={null} onChange={handleChange} />);

  const input = screen.getByRole('combobox');
  fireEvent.focus(input);
  await screen.findByRole('option', { name: /Завод «ЭлектронПрибор»/ });

  fireEvent.keyDown(input, { key: 'Enter' });

  expect(handleChange).toHaveBeenCalledWith(factory);
});
