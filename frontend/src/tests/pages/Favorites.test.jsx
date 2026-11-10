import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Favorites from '../../pages/Favorites';
import { api } from '../../api/backend';

jest.mock('../../api/backend', () => ({ api: jest.fn() }));
const game = { id: 7, title: 'Demo: Favorite', genres: ['rpg'], platforms: ['PC'] };
beforeEach(() => jest.resetAllMocks());
function page() {
  render(
    <MemoryRouter>
      <Favorites />
    </MemoryRouter>,
  );
}

test('removes a favorite only after the scoped API succeeds', async () => {
  api.mockResolvedValueOnce([game]).mockResolvedValueOnce({ ok: true });
  page();
  fireEvent.click(await screen.findByRole('button', { name: /นำ Demo: Favorite ออก/ }));
  await waitFor(() => expect(screen.queryByText(game.title)).not.toBeInTheDocument());
  expect(api).toHaveBeenLastCalledWith('/api/me/favorites/7', { method: 'DELETE' });
  expect(screen.getByText(/ยังไม่มีเกมโปรด/)).toBeInTheDocument();
});

test('retains the favorite if deletion fails', async () => {
  api.mockResolvedValueOnce([game]).mockRejectedValueOnce(new Error('Cannot delete'));
  page();
  fireEvent.click(await screen.findByRole('button', { name: /นำ Demo: Favorite ออก/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Cannot delete');
  expect(screen.getByText(game.title)).toBeInTheDocument();
});
