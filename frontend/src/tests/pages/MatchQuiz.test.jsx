import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MatchQuiz from '../../pages/MatchQuiz';
import { api } from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
jest.mock('../../api/backend', () => ({ api: jest.fn() }));
jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));
beforeEach(() => {
  jest.resetAllMocks();
  useAuth.mockReturnValue({ user: null });
});
test('sends selected preferences and renders match reasons', async () => {
  api.mockResolvedValue([
    {
      id: 1,
      title: 'Test RPG',
      genres: ['rpg'],
      platforms: ['PC'],
      matchScore: 100,
      reasons: ['เนื้อเรื่องตรง'],
    },
  ]);
  render(
    <MemoryRouter>
      <MatchQuiz />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('แนวเกม'), { target: { value: 'action' } });
  fireEvent.click(screen.getByRole('button', { name: 'แนะนำเกมให้ฉัน' }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith('/api/recommendations', {
      method: 'POST',
      body: { genre: 'action', mode: 'solo', style: 'story' },
    }),
  );
  expect(await screen.findByText('Test RPG')).toBeInTheDocument();
  expect(screen.getByText('ตรงกับความชอบ 100/100')).toBeInTheDocument();
  expect(screen.getByText('เนื้อเรื่องตรง')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('แนวเกม'), { target: { value: 'strategy' } });
  expect(screen.queryByText('Test RPG')).not.toBeInTheDocument();
});
test('shows empty results', async () => {
  api.mockResolvedValue([]);
  render(
    <MemoryRouter>
      <MatchQuiz />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'แนะนำเกมให้ฉัน' }));
  expect(await screen.findByText(/ยังไม่มีเกมที่ตรงเงื่อนไข/)).toBeInTheDocument();
});
test('shows API errors', async () => {
  api.mockRejectedValue(new Error('Server offline'));
  render(
    <MemoryRouter>
      <MatchQuiz />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'แนะนำเกมให้ฉัน' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Server offline');
});

test('restores member preferences and prevents editing until restored', async () => {
  useAuth.mockReturnValue({ user: { id: 1 } });
  api.mockResolvedValue({ genre: 'strategy', mode: 'coop', style: 'challenge' });
  render(
    <MemoryRouter>
      <MatchQuiz />
    </MemoryRouter>,
  );
  expect(screen.getByLabelText('แนวเกม')).toBeDisabled();
  await waitFor(() => expect(screen.getByLabelText('แนวเกม')).toHaveValue('strategy'));
  expect(screen.getByLabelText('รูปแบบการเล่น')).toHaveValue('coop');
  expect(screen.getByLabelText('สไตล์การเล่น')).toHaveValue('challenge');
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกความชอบ' }));
  expect(await screen.findByText('บันทึกความชอบแล้ว')).toBeInTheDocument();
  expect(api).toHaveBeenLastCalledWith('/api/me/preferences', {
    method: 'PUT',
    body: { genre: 'strategy', mode: 'coop', style: 'challenge' },
  });
});

test('waits for session restoration before allowing quiz input or guest requests', async () => {
  useAuth.mockReturnValue({ user: null, loading: true });
  const page = render(
    <MemoryRouter>
      <MatchQuiz />
    </MemoryRouter>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('กำลังตรวจสอบบัญชี');
  expect(screen.getByLabelText('แนวเกม')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'แนะนำเกมให้ฉัน' }));
  expect(api).not.toHaveBeenCalled();
  expect(screen.queryByRole('link', { name: 'เข้าสู่ระบบ' })).not.toBeInTheDocument();
  useAuth.mockReturnValue({ user: { id: 1 }, loading: false });
  let restore;
  api.mockReturnValue(
    new Promise((resolve) => {
      restore = resolve;
    }),
  );
  page.rerender(
    <MemoryRouter>
      <MatchQuiz />
    </MemoryRouter>,
  );
  expect(screen.getByLabelText('แนวเกม')).toBeDisabled();
  restore({ genre: 'strategy', mode: 'coop', style: 'challenge' });
  await waitFor(() => expect(screen.getByLabelText('แนวเกม')).toBeEnabled());
  expect(screen.getByLabelText('แนวเกม')).toHaveValue('strategy');
});

test('removes previous successful results when a new request fails', async () => {
  api
    .mockResolvedValueOnce([
      { id: 1, title: 'Old result', genres: [], platforms: [], matchScore: 45 },
    ])
    .mockRejectedValueOnce(new Error('Offline'));
  render(
    <MemoryRouter>
      <MatchQuiz />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'แนะนำเกมให้ฉัน' }));
  expect(await screen.findByText('Old result')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'แนะนำเกมให้ฉัน' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
  expect(screen.queryByText('Old result')).not.toBeInTheDocument();
});
