import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/actuator/info')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ build: { version: '1.0.0-SNAPSHOT' } }),
      });
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          content: [],
          number: 0,
          totalPages: 0,
          first: true,
          last: true,
        }),
    });
  });
});

test('переключает разделы меню и показывает заглушку', async () => {
  render(<App />);

  expect(await screen.findByText('Департаменты не найдены')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Департаменты' })).toBeInTheDocument();
  expect(screen.getByText(/^UI: /)).toBeInTheDocument();
  expect(
    await screen.findByText('Бэкенд: 1.0.0-SNAPSHOT')
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Приборы' }));
  expect(screen.getByText('Появится скоро')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Сотрудники' }));
  expect(screen.getByText('Появится скоро')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Департаменты' }));
  expect(await screen.findByText('Департаменты не найдены')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Департаменты' })).toBeInTheDocument();
});
