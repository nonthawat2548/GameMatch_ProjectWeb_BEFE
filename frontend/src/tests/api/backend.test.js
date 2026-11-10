import { api } from '../../api/backend';
import { SESSION_EXPIRED_EVENT } from '../../auth/session';

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});
afterEach(() => jest.restoreAllMocks());

test('uses native fetch with JWT and JSON without client member IDs', async () => {
  localStorage.setItem('gamematch_token', 'test-token');
  fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  await expect(api('/api/me/favorites/7', { method: 'PUT', body: {} })).resolves.toEqual({
    ok: true,
  });
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:8080/api/me/favorites/7',
    expect.objectContaining({
      method: 'PUT',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: '{}',
    }),
  );
});

test('preserves HTTP 401 for session invalidation', async () => {
  fetch.mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({ error: 'Session expired' }),
  });
  await expect(api('/api/me')).rejects.toMatchObject({ message: 'Session expired', status: 401 });
});

test('handles non-JSON server errors and network outages', async () => {
  fetch.mockResolvedValueOnce({
    ok: false,
    status: 502,
    json: async () => {
      throw new Error();
    },
  });
  await expect(api('/api/games')).rejects.toMatchObject({ status: 502 });
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(api('/api/games')).rejects.toThrow('ติดต่อเซิร์ฟเวอร์ไม่ได้');
});

test('preserves AbortError so cancelled requests stay silent', async () => {
  const error = new DOMException('Cancelled', 'AbortError');
  fetch.mockRejectedValue(error);
  await expect(api('/api/games')).rejects.toBe(error);
});

test('rejects HTML returned with status 200 instead of passing an error object to pages', async () => {
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('HTML');
    },
  });
  await expect(api('/api/games')).rejects.toMatchObject({
    status: 200,
    message: 'เซิร์ฟเวอร์ตอบกลับในรูปแบบที่ไม่ถูกต้อง',
  });
});

test('preserves cancellation while reading JSON', async () => {
  const error = new DOMException('Cancelled', 'AbortError');
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => {
      throw error;
    },
  });
  await expect(api('/api/games')).rejects.toBe(error);
});

test('handles an empty JSON error payload without hiding the HTTP status', async () => {
  fetch.mockResolvedValue({ ok: false, status: 503, json: async () => null });
  await expect(api('/api/games')).rejects.toMatchObject({ status: 503, message: 'HTTP 503' });
});

test('notifies Context and clears a token rejected by a protected API', async () => {
  localStorage.setItem('gamematch_token', 'revoked-token');
  const dispatch = jest.spyOn(window, 'dispatchEvent');
  fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Revoked' }) });
  await expect(api('/api/me/favorites')).rejects.toMatchObject({ status: 401 });
  expect(localStorage.getItem('gamematch_token')).toBeNull();
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: SESSION_EXPIRED_EVENT }));
});

test('a late 401 from an old request cannot remove a newly logged-in token', async () => {
  localStorage.setItem('gamematch_token', 'old-token');
  let finish;
  fetch.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const request = api('/api/me/favorites');
  localStorage.setItem('gamematch_token', 'new-token');
  finish({ ok: false, status: 401, json: async () => ({ error: 'Old session' }) });
  await expect(request).rejects.toMatchObject({ status: 401 });
  expect(localStorage.getItem('gamematch_token')).toBe('new-token');
});

test('a failed login does not clear an existing session', async () => {
  localStorage.setItem('gamematch_token', 'valid-token');
  fetch.mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({ error: 'Wrong password' }),
  });
  await expect(api('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
    status: 401,
  });
  expect(localStorage.getItem('gamematch_token')).toBe('valid-token');
});

test('a member receiving 403 keeps the authenticated session', async () => {
  localStorage.setItem('gamematch_token', 'member-token');
  fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'Admin only' }) });
  await expect(api('/api/admin/games')).rejects.toMatchObject({ status: 403 });
  expect(localStorage.getItem('gamematch_token')).toBe('member-token');
});
