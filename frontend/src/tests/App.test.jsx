import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// ทดสอบ React ทั้งชุดจริง: Router -> Context -> fetch -> JSON -> UI
// จำลองเฉพาะ HTTP responses ใน test; ไม่ได้เป็นผลเชื่อม Go/DB จริง
const game = {
  id: 7,
  title: 'Demo: Journey fixture',
  description: 'Fictional test fixture',
  imageUrl: '',
  genres: ['rpg'],
  tags: ['singleplayer', 'story-rich'],
  platforms: ['PC'],
  isPublished: true,
};
const token = 'test-only-token';
let member;
let favorite;
function response(status, data) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  member = { id: 1, email: 'member@example.com', displayName: 'Member A', role: 'member' };
  favorite = false;
  global.fetch = jest.fn(async (url, options = {}) => {
    const path = new URL(url).pathname;
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : null;
    if (path === '/api/auth/login') return response(200, { token, user: member });
    if (path === '/api/games') return response(200, [game]);
    if (path === '/api/games/7') return response(200, game);
    if (path === '/api/recommendations')
      return response(200, [{ ...game, matchScore: 100, reasons: ['ตรงตามความชอบใน fixture'] }]);
    if (options.headers?.Authorization !== 'Bearer ' + token) {
      return response(401, { error: 'Session expired' });
    }
    if (path === '/api/me' && method === 'PUT') {
      member = { ...member, displayName: body.displayName };
      return response(200, { ok: true });
    }
    if (path === '/api/me') return response(200, member);
    if (path === '/api/me/favorites/7') {
      favorite = method === 'PUT';
      return response(200, { ok: true });
    }
    if (path === '/api/me/favorites') return response(200, favorite ? [game] : []);
    if (path === '/api/auth/logout') return response(200, { ok: true });
    throw new Error('Unexpected test request: ' + method + ' ' + path);
  });
});
afterEach(() => jest.restoreAllMocks());

test('guest matches games, logs in, saves a favorite, updates profile and logs out', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(await screen.findByRole('link', { name: game.title })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'แนะนำเกม' }));
  await user.click(screen.getByRole('button', { name: 'แนะนำเกมให้ฉัน' }));
  expect(await screen.findByText('ตรงกับความชอบ 100/100')).toBeInTheDocument();
  expect(screen.getByText('ตรงตามความชอบใน fixture')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: game.title }));
  await user.click(await screen.findByRole('link', { name: 'เข้าสู่ระบบเพื่อบันทึกเกม' }));
  await user.type(screen.getByLabelText('อีเมล'), member.email);
  await user.type(screen.getByLabelText('รหัสผ่าน'), 'password123');
  await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));
  expect(await screen.findByRole('link', { name: 'Member A' })).toBeInTheDocument();
  expect(localStorage.getItem('gamematch_token')).toBe(token);
  expect(await screen.findByRole('heading', { name: game.title })).toBeInTheDocument();
  await user.click(await screen.findByRole('button', { name: 'เพิ่มในเกมโปรด' }));
  expect(await screen.findByRole('status')).toHaveTextContent('เพิ่มในเกมโปรดแล้ว');
  await user.click(screen.getByRole('link', { name: 'เกมโปรด' }));
  expect(await screen.findByRole('link', { name: game.title })).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:8080/api/me/favorites/7',
    expect.objectContaining({
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token },
    }),
  );
  await user.click(screen.getByRole('link', { name: 'Member A' }));
  fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'Member Updated' } });
  await user.click(screen.getByRole('button', { name: 'บันทึกโปรไฟล์' }));
  expect(
    await within(screen.getByRole('navigation')).findByRole('link', { name: 'Member Updated' }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'ออกจากระบบ' }));
  expect(await screen.findByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
  expect(localStorage.getItem('gamematch_token')).toBeNull();
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:8080/api/auth/logout',
    expect.objectContaining({ method: 'POST' }),
  );
});

test('an expired saved token is removed and a protected URL redirects to login', async () => {
  localStorage.setItem('gamematch_token', 'expired-token');
  window.history.replaceState({}, '', '/me/favorites');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
  expect(localStorage.getItem('gamematch_token')).toBeNull();
  expect(screen.queryByRole('heading', { name: 'เกมโปรดของฉัน' })).not.toBeInTheDocument();
});

test('a member opening the admin URL sees 403 without requesting admin data', async () => {
  localStorage.setItem('gamematch_token', token);
  window.history.replaceState({}, '', '/admin');
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('403');
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(fetch.mock.calls.some(([url]) => new URL(url).pathname.startsWith('/api/admin/'))).toBe(
    false,
  );
});

test('a protected API 401 clears member UI and redirects without needing a reload', async () => {
  localStorage.setItem('gamematch_token', token);
  favorite = true;
  window.history.replaceState({}, '', '/me/favorites');
  const normalResponse = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) =>
    new URL(url).pathname === '/api/me/favorites/7'
      ? response(401, { error: 'Session revoked' })
      : normalResponse(url, options),
  );
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /นำ Demo: Journey fixture ออก/ }));
  expect(await screen.findByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
  expect(localStorage.getItem('gamematch_token')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Member A' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: game.title })).not.toBeInTheDocument();
});

test('switching accounts in another tab hides the previous member favorites', async () => {
  localStorage.setItem('gamematch_token', token);
  favorite = true;
  window.history.replaceState({}, '', '/me/favorites');
  const normalResponse = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => {
    if (options?.headers?.Authorization === 'Bearer token-b') {
      const path = new URL(url).pathname;
      if (path === '/api/me') return response(200, { ...member, id: 2, displayName: 'Member B' });
      if (path === '/api/me/favorites') return response(200, []);
    }
    return normalResponse(url, options);
  });
  render(<App />);
  await screen.findByRole('link', { name: game.title });
  localStorage.setItem('gamematch_token', 'token-b');
  fireEvent(
    window,
    new StorageEvent('storage', {
      key: 'gamematch_token',
      storageArea: localStorage,
      newValue: 'token-b',
    }),
  );
  expect(screen.queryByRole('link', { name: game.title })).not.toBeInTheDocument();
  expect(await screen.findByRole('link', { name: 'Member B' })).toBeInTheDocument();
  expect(await screen.findByText(/ยังไม่มีเกมโปรด/)).toBeInTheDocument();
});

test('retries a temporary session outage while retaining the protected URL', async () => {
  localStorage.setItem('gamematch_token', token);
  window.history.replaceState({}, '', '/me/favorites');
  const normalResponse = fetch.getMockImplementation();
  fetch
    .mockImplementationOnce(() => response(503, { error: 'Database unavailable' }))
    .mockImplementation(normalResponse);
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
  expect(window.location.pathname).toBe('/me/favorites');
  expect(localStorage.getItem('gamematch_token')).toBe(token);
  fireEvent.click(screen.getByRole('button', { name: 'ตรวจสอบบัญชีอีกครั้ง' }));
  expect(await screen.findByRole('heading', { name: 'เกมโปรดของฉัน' })).toBeInTheDocument();
  expect(await screen.findByText(/ยังไม่มีเกมโปรด/)).toBeInTheDocument();
});

test('returns to a protected favorites page after login instead of sending the member home', async () => {
  window.history.replaceState({}, '', '/me/favorites');
  render(<App />);
  await screen.findByRole('heading', { name: 'เข้าสู่ระบบ' });
  fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: member.email } });
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));
  expect(await screen.findByRole('heading', { name: 'เกมโปรดของฉัน' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/me/favorites');
});

test('separates home, catalog and about routes using the main navigation', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'หาเกมที่อยากเล่น' })).toBeInTheDocument();
  await screen.findByRole('link', { name: game.title });
  fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'เกมทั้งหมด' }));
  expect(await screen.findByRole('heading', { name: 'เกมทั้งหมด' })).toBeInTheDocument();
  await screen.findByRole('searchbox');
  fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'เกี่ยวกับ' }));
  expect(screen.getByRole('heading', { name: 'เกี่ยวกับ GameMatch' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/about');
});
