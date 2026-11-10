import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import Detail from '../../pages/Detail';
import { api } from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';

jest.mock('../../api/backend', () => ({ api: jest.fn() }));
jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));
const game = {
  id: 1,
  rawgId: 123,
  title: 'Demo: First game',
  description: '',
  imageUrl: 'https://example.com/broken.jpg',
  genres: ['rpg'],
  tags: ['singleplayer'],
  platforms: ['PC'],
};
const second = { ...game, id: 2, title: 'Demo: Second game' };
beforeEach(() => {
  jest.resetAllMocks();
  useAuth.mockReturnValue({ user: null });
});
function page() {
  render(
    <MemoryRouter initialEntries={['/games/1']}>
      <Link to="/games/2">Second game</Link>
      <Routes>
        <Route path="/games/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('shows guest detail, source attribution and a fallback for a broken image', async () => {
  api.mockResolvedValue(game);
  page();
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลด');
  expect(await screen.findByRole('heading', { name: game.title })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'เข้าสู่ระบบเพื่อบันทึกเกม' })).toHaveAttribute(
    'href',
    '/login',
  );
  expect(screen.getByRole('link', { name: 'RAWG' })).toHaveAttribute(
    'href',
    'https://rawg.io/games/123',
  );
  expect(screen.getByText('แพลตฟอร์ม')).toBeInTheDocument();
  expect(screen.getByText('PC')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← กลับไปรายการเกม' })).toHaveAttribute(
    'href',
    '/discover',
  );
  fireEvent.error(screen.getByRole('img', { name: game.title }));
  expect(screen.getByLabelText('ไม่มีภาพเกม')).toBeInTheDocument();
});

test('retries a failed detail request', async () => {
  api.mockRejectedValueOnce(new Error('Detail offline')).mockResolvedValueOnce(game);
  page();
  expect(await screen.findByRole('alert')).toHaveTextContent('Detail offline');
  fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }));
  expect(await screen.findByRole('heading', { name: game.title })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('disables duplicate favorite writes and reports success only after completion', async () => {
  useAuth.mockReturnValue({ user: { id: 1 } });
  let finish;
  api.mockResolvedValueOnce(game).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  page();
  fireEvent.click(await screen.findByRole('button', { name: 'เพิ่มในเกมโปรด' }));
  expect(screen.getByRole('button', { name: 'กำลังบันทึก…' })).toBeDisabled();
  expect(screen.queryByText('เพิ่มในเกมโปรดแล้ว')).not.toBeInTheDocument();
  await act(async () => {
    finish({ ok: true });
  });
  expect(screen.getByRole('status')).toHaveTextContent('เพิ่มในเกมโปรดแล้ว');
  expect(api).toHaveBeenLastCalledWith('/api/me/favorites/1', { method: 'PUT' });
});

test('an old detail response cannot replace the game selected after navigation', async () => {
  let finish;
  api
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    )
    .mockResolvedValueOnce(second);
  page();
  fireEvent.click(screen.getByRole('link', { name: 'Second game' }));
  await screen.findByRole('heading', { name: second.title });
  await act(async () => {
    finish(game);
  });
  expect(screen.queryByRole('heading', { name: game.title })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: second.title })).toBeInTheDocument();
});

test('a delayed favorite write for the previous game cannot show success on the next game', async () => {
  useAuth.mockReturnValue({ user: { id: 1 } });
  let finish;
  api
    .mockResolvedValueOnce(game)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    )
    .mockResolvedValueOnce(second);
  page();
  fireEvent.click(await screen.findByRole('button', { name: 'เพิ่มในเกมโปรด' }));
  fireEvent.click(screen.getByRole('link', { name: 'Second game' }));
  await screen.findByRole('heading', { name: second.title });
  await act(async () => {
    finish({ ok: true });
  });
  await waitFor(() => expect(screen.getByRole('button', { name: 'เพิ่มในเกมโปรด' })).toBeEnabled());
  expect(screen.queryByText('เพิ่มในเกมโปรดแล้ว')).not.toBeInTheDocument();
});
