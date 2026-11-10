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

test('paginates 100 games and resets the page after search or genre selection without refetching', async () => {
  api.mockResolvedValue(
    Array.from({ length: 100 }, (_, i) => ({
      ...game,
      id: i + 1,
      title: `Demo: Game ${String(i + 1).padStart(3, '0')}`,
      genres: i % 2 ? ['action'] : ['rpg'],
    })),
  );
  page();
  await screen.findByText('Demo: Game 001');
  expect(document.querySelectorAll('.game-card')).toHaveLength(24);
  expect(screen.getByText('หน้า 1 / 5 · ครั้งละ 24 เกม')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
  expect(screen.getByText('Demo: Game 025')).toBeInTheDocument();
  expect(screen.queryByText('Demo: Game 001')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '100' } });
  expect(screen.getByText('Demo: Game 100')).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'หน้ารายการเกม' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
  fireEvent.click(screen.getByRole('button', { name: 'RPG' }));
  expect(screen.getByText('Demo: Game 001')).toBeInTheDocument();
  expect(screen.getByText('หน้า 1 / 3 · ครั้งละ 24 เกม')).toBeInTheDocument();
  expect(api).toHaveBeenCalledTimes(1);
});

test('switches between source popularity order, release dates and names locally', async () => {
  api.mockResolvedValue([
    { ...game, title: 'Demo: Z Popular', releaseDate: '2020-01-01' },
    { ...game, id: 2, title: 'Demo: A Recent', releaseDate: '2026-11-09' },
  ]);
  page();
  await screen.findByText('Demo: Z Popular');
  expect(document.querySelector('.game-card h2')).toHaveTextContent('Demo: Z Popular');
  fireEvent.change(screen.getByLabelText('เรียงตาม'), { target: { value: 'newest' } });
  expect(document.querySelector('.game-card h2')).toHaveTextContent('Demo: A Recent');
  fireEvent.change(screen.getByLabelText('เรียงตาม'), { target: { value: 'popular' } });
  expect(document.querySelector('.game-card h2')).toHaveTextContent('Demo: Z Popular');
  expect(api).toHaveBeenCalledTimes(1);
});
