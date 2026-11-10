import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Admin from '../../pages/Admin';
import { api } from '../../api/backend';

jest.mock('../../api/backend', () => ({ api: jest.fn() }));
const game = {
  id: 7,
  rawgId: 123,
  title: 'Demo: Admin game',
  description: 'Admin description',
  imageUrl: '',
  genres: ['rpg'],
  tags: ['singleplayer'],
  platforms: ['PC'],
  isPublished: true,
  matchScore: 0,
};
beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => jest.restoreAllMocks());
function fillTitle(title = 'Demo: New game') {
  fireEvent.change(screen.getByLabelText('ชื่อเกม'), { target: { value: title } });
}
function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกเกม' }));
}

test('imports Steam new releases and reloads the persisted catalog', async () => {
  api
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce({ imported: 12 })
    .mockResolvedValueOnce([game]);
  render(<Admin />);
  await screen.findByText('ยังไม่มีเกม กด Sync หรือเพิ่มข้อมูลด้านบน');
  fireEvent.click(screen.getByRole('button', { name: 'อัปเดตเกมออกใหม่ Steam' }));
  expect(await screen.findByRole('status')).toHaveTextContent('อัปเดตจาก Steam 12 เกมแล้ว');
  expect(api).toHaveBeenCalledWith('/api/admin/sync/steam', { method: 'POST' });
  expect(await screen.findByText(game.title)).toBeInTheDocument();
});

test('retries a failed initial catalog request', async () => {
  api.mockRejectedValueOnce(new Error('Catalog offline')).mockResolvedValueOnce([game]);
  render(<Admin />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Catalog offline');
  fireEvent.click(screen.getByRole('button', { name: 'โหลดรายการอีกครั้ง' }));
  expect(await screen.findByText(game.title)).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a failed catalog retry does not claim that a write succeeded', async () => {
  api
    .mockRejectedValueOnce(new Error('Catalog offline'))
    .mockRejectedValueOnce(new Error('Still offline'));
  render(<Admin />);
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Sync RAWG (40 เกม)' })).toBeDisabled();
  expect(screen.getByLabelText('ชื่อเกม')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'โหลดรายการอีกครั้ง' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Still offline'));
  expect(screen.getByRole('alert')).not.toHaveTextContent('ดำเนินการสำเร็จแล้ว');
  expect(api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
});

test('creates a game with normalized arrays even when submitting without blur', async () => {
  api.mockResolvedValueOnce([]).mockResolvedValueOnce({ id: 8 }).mockResolvedValueOnce([game]);
  render(<Admin />);
  await screen.findByText('ยังไม่มีเกม กด Sync หรือเพิ่มข้อมูลด้านบน');
  fillTitle('  Demo: New game  ');
  fireEvent.change(screen.getByLabelText('Genres เช่น rpg, action'), {
    target: { value: ' rpg, action, ' },
  });
  fireEvent.change(screen.getByLabelText('Tags เช่น singleplayer, story-rich'), {
    target: { value: ' singleplayer, story-rich, ' },
  });
  submit();
  expect(await screen.findByRole('status')).toHaveTextContent('บันทึกข้อมูลแล้ว');
  expect(api).toHaveBeenCalledWith('/api/admin/games', {
    method: 'POST',
    body: {
      title: 'Demo: New game',
      description: '',
      imageUrl: '',
      genres: ['rpg', 'action'],
      tags: ['singleplayer', 'story-rich'],
      platforms: ['PC'],
      isPublished: true,
    },
  });
  expect(screen.getByLabelText('ชื่อเกม')).toHaveValue('');
});

test('updates a game and its publication flag without sending response-only fields', async () => {
  api
    .mockResolvedValueOnce([game])
    .mockResolvedValueOnce({ id: 7 })
    .mockResolvedValueOnce([{ ...game, isPublished: false }]);
  render(<Admin />);
  await screen.findByText(game.title);
  fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
  expect(screen.getByLabelText('คำอธิบาย')).toHaveValue('Admin description');
  fireEvent.click(screen.getByRole('checkbox', { name: 'เผยแพร่' }));
  submit();
  expect(await screen.findByText('ซ่อน')).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/api/admin/games/7', {
    method: 'PUT',
    body: {
      title: game.title,
      description: game.description,
      imageUrl: '',
      genres: ['rpg'],
      tags: ['singleplayer'],
      platforms: ['PC'],
      isPublished: false,
    },
  });
});

test('keeps the editing form after a failed write', async () => {
  api.mockResolvedValueOnce([game]).mockRejectedValueOnce(new Error('Write failed'));
  render(<Admin />);
  await screen.findByText(game.title);
  fillTitle();
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent('Write failed');
  expect(screen.getByLabelText('ชื่อเกม')).toHaveValue('Demo: New game');
  expect(screen.getByRole('button', { name: 'บันทึกเกม' })).toBeEnabled();
});

test('retries only the catalog after a successful save followed by reload failure', async () => {
  api
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce({ id: 8 })
    .mockRejectedValueOnce(new Error('Read failed'))
    .mockResolvedValueOnce([game]);
  render(<Admin />);
  await screen.findByText('ยังไม่มีเกม กด Sync หรือเพิ่มข้อมูลด้านบน');
  fillTitle();
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'ดำเนินการสำเร็จแล้ว แต่โหลดรายการล่าสุดไม่ได้',
  );
  fireEvent.click(screen.getByRole('button', { name: 'โหลดรายการอีกครั้ง' }));
  expect(await screen.findByText(game.title)).toBeInTheDocument();
  expect(api.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
});

test('cancels deletion or deletes the selected record after confirmation', async () => {
  api.mockResolvedValueOnce([game]).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce([]);
  render(<Admin />);
  await screen.findByText(game.title);
  window.confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getByRole('button', { name: 'ลบ' }));
  expect(api).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'ลบ' }));
  expect(await screen.findByRole('status')).toHaveTextContent('ลบเกมแล้ว');
  await waitFor(() => expect(screen.queryByText(game.title)).not.toBeInTheDocument());
  expect(api).toHaveBeenCalledWith('/api/admin/games/7', { method: 'DELETE' });
});

test('keeps the current catalog visible when RAWG sync fails', async () => {
  api.mockResolvedValueOnce([game]).mockRejectedValueOnce(new Error('RAWG quota exceeded'));
  render(<Admin />);
  await screen.findByText(game.title);
  fireEvent.click(screen.getByRole('button', { name: 'Sync RAWG (40 เกม)' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('RAWG quota exceeded');
  expect(screen.getByText(game.title)).toBeInTheDocument();
  expect(api).toHaveBeenLastCalledWith('/api/admin/sync', { method: 'POST' });
});

test('shows the actual imported count after a successful sync', async () => {
  api
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce({ imported: 3 })
    .mockResolvedValueOnce([game]);
  render(<Admin />);
  await screen.findByText('ยังไม่มีเกม กด Sync หรือเพิ่มข้อมูลด้านบน');
  fireEvent.click(screen.getByRole('button', { name: 'Sync RAWG (40 เกม)' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Sync 3 เกมแล้ว');
  expect(await screen.findByText(game.title)).toBeInTheDocument();
});

test('rejects insecure images and Thai titles exceeding the backend byte limit', async () => {
  api.mockResolvedValueOnce([]);
  render(<Admin />);
  await screen.findByText('ยังไม่มีเกม กด Sync หรือเพิ่มข้อมูลด้านบน');
  fillTitle('ก'.repeat(84));
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent('250 ไบต์');
  fillTitle();
  fireEvent.change(screen.getByLabelText('รูป HTTPS URL'), {
    target: { value: 'http://example.com/game.jpg' },
  });
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent('HTTPS URL');
  expect(api).toHaveBeenCalledTimes(1);
});
