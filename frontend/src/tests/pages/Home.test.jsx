import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../../pages/Home';
import { api } from '../../api/backend';

jest.mock('../../api/backend', () => ({ api: jest.fn() }));
const games = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  title: 'Demo: Home ' + (index + 1),
  genres: ['rpg'],
  platforms: ['PC'],
}));
beforeEach(() => jest.resetAllMocks());
function page() {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

test('loads a four-game preview and links to the catalog and quiz', async () => {
  api.mockResolvedValue(games);
  page();
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลดเกม');
  expect(await screen.findByRole('link', { name: games[0].title })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: games[3].title })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: games[4].title })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'ดูเกมทั้งหมด' })).toHaveAttribute('href', '/discover');
  expect(screen.getByRole('link', { name: 'ลองจับคู่เกม' })).toHaveAttribute('href', '/match');
});

test('shows an explicit empty catalog instead of inventing sample games', async () => {
  api.mockResolvedValue([]);
  page();
  expect(await screen.findByText('ยังไม่มีเกมในคลัง กลับมาดูใหม่ได้ภายหลัง')).toBeInTheDocument();
  expect(screen.queryByText(games[0].title)).not.toBeInTheDocument();
});

test('retries catalog loading while keeping the home navigation available', async () => {
  api.mockRejectedValueOnce(new Error('Server offline')).mockResolvedValueOnce(games);
  page();
  expect(await screen.findByRole('alert')).toHaveTextContent('Server offline');
  expect(screen.getByRole('link', { name: 'ลองจับคู่เกม' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }));
  expect(await screen.findByRole('link', { name: games[0].title })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
