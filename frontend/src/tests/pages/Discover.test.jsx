import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Discover from '../../pages/Discover';
import { api } from '../../api/backend';

jest.mock('../../api/backend', () => ({ api: jest.fn() }));
const game = { id: 1, title: 'Demo: Test RPG', genres: ['rpg'], platforms: ['PC'] };
function page() {
  return render(
    <MemoryRouter>
      <Discover />
    </MemoryRouter>,
  );
}
beforeEach(() => jest.resetAllMocks());

test('shows loading, results and local empty search without another API request', async () => {
  api.mockResolvedValueOnce([game]);
  page();
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลดเกม');
  expect(await screen.findByText(game.title)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no match' } });
  expect(await screen.findByText(/ยังไม่มีเกมที่ตรงเงื่อนไข/)).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/api/games');
  expect(api).toHaveBeenCalledTimes(1);
});

test('lets a guest retry after a server outage', async () => {
  api.mockRejectedValueOnce(new Error('Server offline')).mockResolvedValueOnce([game]);
  page();
  expect(await screen.findByRole('alert')).toHaveTextContent('Server offline');
  fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }));
  expect(await screen.findByText(game.title)).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('filters by actual game genres without requesting the API again', async () => {
  api.mockResolvedValue([game, { ...game, id: 2, title: 'Demo: Action', genres: ['action'] }]);
  page();
  await screen.findByText('Demo: Action');
  fireEvent.click(screen.getByRole('button', { name: 'RPG' }));
  expect(screen.getByText(game.title)).toBeInTheDocument();
  expect(screen.queryByText('Demo: Action')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('พบ 1 เกม');
  expect(screen.getByRole('button', { name: 'RPG' })).toHaveAttribute('aria-pressed', 'true');
  expect(api).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'ทุกแนว' }));
  expect(screen.getByText('Demo: Action')).toBeInTheDocument();
});

test('combines the selected genre with a case-insensitive title search', async () => {
  api.mockResolvedValue([game, { ...game, id: 2, title: 'Demo: Action', genres: ['action'] }]);
  page();
  await screen.findByText('Demo: Action');
  fireEvent.click(screen.getByRole('button', { name: 'RPG' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  TEST  ' } });
  expect(screen.getByText(game.title)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'RPG' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'action' } });
  expect(screen.getByText(/ยังไม่มีเกมที่ตรงเงื่อนไข/)).toBeInTheDocument();
  expect(api).toHaveBeenCalledTimes(1);
});
